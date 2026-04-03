import { supabaseAdmin } from '@/lib/supabase'
import * as aliexpress from '@/lib/suppliers/aliexpress'
import * as cj from '@/lib/suppliers/cj-dropshipping'
import { autoOrderTakealot } from './auto-order-takealot'
import { autoOrderMakro } from './auto-order-makro'
import { sendEmail } from '@/lib/resend'
import OrderConfirmationEmail from '@/emails/OrderConfirmation'
import OrderShippedEmail from '@/emails/OrderShipped'
import React from 'react'

// Suppliers handled by Playwright auto-ordering
const PLAYWRIGHT_SUPPLIERS: Record<string, (order: Parameters<typeof autoOrderTakealot>[0]) => Promise<{ success: boolean; orderNumber?: string; error?: string }>> = {
  takealot: autoOrderTakealot,
  makro: autoOrderMakro,
}

// Suppliers with no automation possible (BidOrBuy listings vary, Hivve B2B needs contact)
const MANUAL_ONLY_SUPPLIERS = ['bidorbuy', 'hivve', 'gumtree', 'game', 'manual']

export async function runFulfillmentAgent(orderId: string): Promise<void> {
  const start = Date.now()

  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single()

  if (error || !order) throw new Error(`Order not found: ${orderId}`)
  if (order.payment_status !== 'paid') throw new Error('Order not paid — refusing to fulfill')

  await supabaseAdmin.from('agent_logs').insert({
    agent: 'fulfillment',
    action: 'fulfillment_start',
    input: { orderId, orderNumber: order.order_number },
    output: null,
    reasoning: 'Starting fulfillment process',
    success: true,
    duration_ms: 0,
  })

  const items = order.items as Array<{
    product_id: string
    name: string
    qty: number
    unit_price: number
    supplier_cost: number
    supplier: string
    supplier_product_id: string
    supplier_product_url?: string
    variant_id?: string
    shipping_service?: string
  }>

  await supabaseAdmin
    .from('orders')
    .update({ fulfillment_status: 'fulfilling', status: 'processing', updated_at: new Date().toISOString() })
    .eq('id', orderId)

  const shippingAddr = order.delivery_address as {
    name: string; phone: string; email: string
    address: string; city: string; province: string; postalCode: string
  }

  // Split items by supplier type
  const aliItems = items.filter(i => i.supplier === 'aliexpress')
  const cjItems = items.filter(i => i.supplier === 'cj')
  const autoSAItems = items.filter(i => i.supplier in PLAYWRIGHT_SUPPLIERS)
  const manualItems = items.filter(i => MANUAL_ONLY_SUPPLIERS.includes(i.supplier))

  // ── AliExpress orders (automatic) ──────────────────────────────────────
  for (const item of aliItems) {
    try {
      const details = await aliexpress.getProductDetails(item.supplier_product_id)
      const currentPrice =
        parseFloat(
          details?.aliexpress_ds_product_get_response?.result
            ?.ae_item_sku_info_dtos?.ae_item_sku_info_d_t_o?.[0]
            ?.sku_price || '999'
        ) * 18.5

      if (currentPrice > item.supplier_cost * 1.1) {
        const newMargin = ((item.unit_price - currentPrice) / item.unit_price) * 100
        if (newMargin < 10) {
          await supabaseAdmin.from('agent_logs').insert({
            agent: 'fulfillment', action: 'price_mismatch',
            input: { orderId, item: item.name, expectedCost: item.supplier_cost, currentCost: currentPrice },
            output: { action: 'skipped_needs_review' },
            reasoning: `Supplier price increased to R${currentPrice.toFixed(2)}, margin below 10%`,
            success: false, duration_ms: Date.now() - start,
          })
          continue
        }
      }

      const result = await aliexpress.placeOrder({
        productId: item.supplier_product_id,
        skuId: item.variant_id || '',
        quantity: item.qty,
        shippingAddress: {
          name: shippingAddr.name, phone: shippingAddr.phone,
          address: shippingAddr.address, city: shippingAddr.city,
          province: shippingAddr.province, postalCode: shippingAddr.postalCode,
          country: 'ZA',
        },
        logisticsService: item.shipping_service || 'AliExpress Standard Shipping',
      })

      const supplierOrderId =
        result?.aliexpress_ds_order_create_response?.result?.order_list?.[0]?.order_id

      await supabaseAdmin.from('supplier_orders').insert({
        order_id: orderId, supplier: 'aliexpress',
        supplier_order_id: supplierOrderId?.toString(),
        items: [item], total_cost: item.supplier_cost * item.qty,
        shipping_address: shippingAddr, status: 'confirmed',
        placed_at: new Date().toISOString(),
      })
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e)
      await supabaseAdmin.from('agent_logs').insert({
        agent: 'fulfillment', action: 'aliexpress_order_error',
        input: { orderId, item: item.name }, output: null,
        reasoning: errorMessage, success: false, error: errorMessage,
        duration_ms: Date.now() - start,
      })
    }
  }

  // ── CJ Dropshipping orders (automatic) ─────────────────────────────────
  if (cjItems.length > 0) {
    try {
      const result = await cj.createOrder({
        orderNumber: order.order_number,
        shippingAddress: {
          name: shippingAddr.name, phone: shippingAddr.phone,
          email: order.customer_email, address: shippingAddr.address,
          city: shippingAddr.city, province: shippingAddr.province,
          postalCode: shippingAddr.postalCode,
        },
        products: cjItems.map(i => ({
          vid: i.variant_id || i.supplier_product_id,
          quantity: i.qty,
          shippingName: i.shipping_service || 'CJPacket Ordinary',
        })),
      })

      await supabaseAdmin.from('supplier_orders').insert({
        order_id: orderId, supplier: 'cj',
        supplier_order_id: result?.data?.orderId,
        items: cjItems,
        total_cost: cjItems.reduce((sum, i) => sum + i.supplier_cost * i.qty, 0),
        shipping_address: shippingAddr, status: 'confirmed',
        placed_at: new Date().toISOString(),
      })
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e)
      console.error('CJ order error:', e)
      await supabaseAdmin.from('agent_logs').insert({
        agent: 'fulfillment', action: 'cj_order_error',
        input: { orderId }, output: null, success: false,
        error: errorMessage, duration_ms: Date.now() - start,
      })
    }
  }

  // ── Takealot / Makro — Playwright auto-ordering ────────────────────────
  for (const item of autoSAItems) {
    const autoOrder = PLAYWRIGHT_SUPPLIERS[item.supplier]
    const productUrl = item.supplier_product_url || ''

    if (!productUrl) {
      // No URL stored — fall back to manual email for this item
      manualItems.push(item)
      continue
    }

    try {
      const result = await autoOrder({
        productUrl,
        qty: item.qty,
        deliverTo: {
          name: shippingAddr.name,
          phone: shippingAddr.phone,
          address: shippingAddr.address,
          city: shippingAddr.city,
          province: shippingAddr.province,
          postalCode: shippingAddr.postalCode,
        },
      })

      if (result.success) {
        await supabaseAdmin.from('supplier_orders').insert({
          order_id: orderId,
          supplier: item.supplier,
          supplier_order_id: result.orderNumber,
          items: [item],
          total_cost: item.supplier_cost * item.qty,
          shipping_address: shippingAddr,
          status: 'confirmed',
          placed_at: new Date().toISOString(),
          notes: `Auto-ordered via Playwright. Supplier order: ${result.orderNumber}`,
        })

        await supabaseAdmin.from('agent_logs').insert({
          agent: 'fulfillment', action: `${item.supplier}_auto_order_success`,
          input: { orderId, item: item.name, productUrl },
          output: { orderNumber: result.orderNumber },
          reasoning: `Successfully auto-ordered from ${item.supplier}`,
          success: true, duration_ms: Date.now() - start,
        })
      } else {
        // Auto-order failed — push to manual fallback
        console.error(`${item.supplier} auto-order failed:`, result.error)
        manualItems.push(item)

        await supabaseAdmin.from('agent_logs').insert({
          agent: 'fulfillment', action: `${item.supplier}_auto_order_failed`,
          input: { orderId, item: item.name },
          output: { error: result.error },
          reasoning: `Auto-order failed, falling back to manual email`,
          success: false, duration_ms: Date.now() - start,
        })
      }
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e)
      console.error(`${item.supplier} auto-order exception:`, e)
      manualItems.push(item) // fallback to manual
      await supabaseAdmin.from('agent_logs').insert({
        agent: 'fulfillment', action: `${item.supplier}_auto_order_error`,
        input: { orderId, item: item.name }, output: null,
        reasoning: errorMessage, success: false,
        error: errorMessage, duration_ms: Date.now() - start,
      })
    }
  }

  // ── Manual fallback — email owner for items that couldn't be auto-ordered ──
  if (manualItems.length > 0) {
    try {
      await supabaseAdmin.from('supplier_orders').insert({
        order_id: orderId,
        supplier: manualItems[0].supplier,
        supplier_order_id: null,
        items: manualItems,
        total_cost: manualItems.reduce((sum, i) => sum + i.supplier_cost * i.qty, 0),
        shipping_address: shippingAddr,
        status: 'needs_manual_order',
        placed_at: new Date().toISOString(),
      })

      const ownerEmail = process.env.OWNER_EMAIL || process.env.ADMIN_EMAIL
      if (ownerEmail) {
        const itemRows = manualItems.map(i => {
          const name = i.supplier.charAt(0).toUpperCase() + i.supplier.slice(1)
          const url = i.supplier_product_url || `https://www.${i.supplier}.co.za`
          return `• ${i.name} × ${i.qty}\n  Buy at: ${name} → ${url}\n  Cost: R${(i.supplier_cost * i.qty).toFixed(2)}`
        }).join('\n\n')

        await sendEmail({
          to: ownerEmail,
          subject: `⚠️ Manual order needed: ${order.order_number}`,
          react: React.createElement('div', null,
            React.createElement('h2', null, `Order ${order.order_number} — Action Required`),
            React.createElement('p', null, `Auto-order could not complete for some items. Please order these manually:`),
            React.createElement('pre', { style: { background: '#f5f5f5', padding: '16px', borderRadius: '8px', fontFamily: 'monospace' } }, itemRows),
            React.createElement('p', null, `Ship to: ${shippingAddr.name}, ${shippingAddr.address}, ${shippingAddr.city}, ${shippingAddr.province} ${shippingAddr.postalCode}`),
            React.createElement('p', null, `Phone: ${shippingAddr.phone}`),
            React.createElement('p', { style: { color: '#16a34a', fontWeight: 'bold' } }, `Your profit on this order: R${order.total_profit?.toFixed(2) || '—'}`),
          ),
        })
      }
    } catch (e: unknown) {
      console.error('Manual fallback error:', e)
    }
  }

  await supabaseAdmin
    .from('orders')
    .update({ fulfillment_status: 'fulfilling', status: 'confirmed', updated_at: new Date().toISOString() })
    .eq('id', orderId)

  // Send confirmation email to customer
  try {
    await sendEmail({
      to: order.customer_email,
      subject: `Order ${order.order_number} Confirmed — DropEmpire SA`,
      react: React.createElement(OrderConfirmationEmail, { order }),
    })
  } catch (e) {
    console.error('Email send error:', e)
  }

  await supabaseAdmin.from('agent_logs').insert({
    agent: 'fulfillment', action: 'fulfillment_complete',
    input: { orderId },
    output: { status: 'fulfilling', autoItems: aliItems.length + cjItems.length + autoSAItems.length, manualItems: manualItems.length },
    reasoning: 'Fulfillment complete — auto orders placed via API and Playwright, manual fallback emailed',
    success: true, duration_ms: Date.now() - start,
  })
}

export async function checkAndUpdateTracking(): Promise<void> {
  const { data: supplierOrders } = await supabaseAdmin
    .from('supplier_orders')
    .select('*, orders(*)')
    .in('status', ['confirmed', 'placed'])

  if (!supplierOrders) return

  for (const so of supplierOrders) {
    try {
      let tracking: Record<string, string> | null = null

      if (so.supplier === 'aliexpress' && so.supplier_order_id) {
        const result = await aliexpress.getTracking(so.supplier_order_id)
        tracking = result?.aliexpress_ds_logistics_tracking_query_response?.result?.tracking_detail_info_dto
      } else if (so.supplier === 'cj' && so.supplier_order_id) {
        const result = await cj.getOrderTracking(so.supplier_order_id)
        tracking = result?.data
      }

      if (tracking?.tracking_number) {
        await supabaseAdmin
          .from('supplier_orders')
          .update({ tracking_number: tracking.tracking_number, status: 'shipped' })
          .eq('id', so.id)

        await supabaseAdmin
          .from('orders')
          .update({
            tracking_number: tracking.tracking_number,
            status: 'shipped',
            fulfillment_status: 'fulfilled',
            updated_at: new Date().toISOString(),
          })
          .eq('id', so.order_id)

        const order = so.orders as Record<string, unknown>
        await sendEmail({
          to: order.customer_email as string,
          subject: `Your DropEmpire SA order is on its way!`,
          react: React.createElement(OrderShippedEmail, {
            order,
            trackingNumber: tracking.tracking_number,
          }),
        })
      }
    } catch (e) {
      console.error(`Tracking check error for ${so.id}:`, e)
    }
  }
}
