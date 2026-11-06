import { supabaseAdmin } from '@/lib/supabase'
import * as aliexpress from '@/lib/suppliers/aliexpress'
import * as cj from '@/lib/suppliers/cj-dropshipping'
import { autoOrderTakealot } from './auto-order-takealot'
import { autoOrderMakro } from './auto-order-makro'
import { sendEmail } from '@/lib/resend'
import OrderConfirmationEmail from '@/emails/OrderConfirmation'
import OrderShippedEmail from '@/emails/OrderShipped'
import React from 'react'
import type { Order } from '@/types'
import { buildShippingAddress } from '@/lib/orders/shipping'
import { notifyOwner } from '@/lib/orders/notify'

// Suppliers handled by Playwright auto-ordering
const PLAYWRIGHT_SUPPLIERS: Record<string, (order: Parameters<typeof autoOrderTakealot>[0]) => Promise<{ success: boolean; orderNumber?: string; error?: string }>> = {
  takealot: autoOrderTakealot,
  makro: autoOrderMakro,
}

// Suppliers with no automation possible (BidOrBuy listings vary, Hivve B2B needs contact)
const MANUAL_ONLY_SUPPLIERS = ['bidorbuy', 'hivve', 'gumtree', 'game', 'manual']

// Must match supplier_orders_supplier_check (migration 005).
const SUPPLIER_ORDER_SUPPLIERS = ['aliexpress', 'cj', 'makro', 'takealot', 'game', 'bidorbuy', 'hivve', 'gumtree', 'manual']

type OrderItem = {
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
}

/** An item the agent could not order by itself, and why. Every one of these reaches the owner. */
type ManualItem = { item: OrderItem; reason: string }

/**
 * 'manual' (default): a paid order waits for the owner to approve it in the admin
 * before any money is spent with a supplier. 'auto': fulfil as soon as payment clears.
 */
export function getFulfillmentMode(): 'manual' | 'auto' {
  return process.env.FULFILLMENT_MODE === 'auto' ? 'auto' : 'manual'
}

async function sendCustomerConfirmation(order: Order, orderId: string) {
  try {
    await sendEmail({
      to: order.customer_email,
      subject: `Order ${order.order_number} Confirmed — DropEmpire SA`,
      react: React.createElement(OrderConfirmationEmail, { order }),
    })
  } catch (e) {
    console.error('Email send error:', e)
    await supabaseAdmin.from('agent_logs').insert({
      agent: 'fulfillment', action: 'customer_email_failed',
      input: { orderId }, output: null, success: false,
      error: e instanceof Error ? e.message : String(e), duration_ms: 0,
    })
  }
}

/** Manual mode: tell the owner a paid order is waiting, and confirm receipt to the customer. */
async function requestApproval(orderId: string): Promise<void> {
  const { data: order } = await supabaseAdmin.from('orders').select('*').eq('id', orderId).maybeSingle()
  if (!order) return

  await supabaseAdmin.from('agent_logs').insert({
    agent: 'fulfillment', action: 'awaiting_approval',
    input: { orderId, orderNumber: order.order_number }, output: null,
    reasoning: 'FULFILLMENT_MODE is manual: waiting for owner approval before ordering from suppliers',
    success: true, duration_ms: 0,
  })

  await notifyOwner(`Approval needed: paid order ${order.order_number}`, [
    `Order ${order.order_number} has been paid (R${Number(order.total).toFixed(2)}) and is waiting for your approval.`,
    'Open Admin → Orders and click "Approve & order". Nothing has been bought from suppliers yet.',
  ])
  await sendCustomerConfirmation(order, orderId)
}

export async function runFulfillmentAgent(
  orderId: string,
  opts: { approved?: boolean } = {}
): Promise<void> {
  const start = Date.now()

  const { data: existing, error } = await supabaseAdmin
    .from('orders')
    .select('id, payment_status, fulfillment_status')
    .eq('id', orderId)
    .maybeSingle()

  if (error || !existing) throw new Error(`Order not found: ${orderId}`)
  if (existing.payment_status !== 'paid') throw new Error('Order not paid — refusing to fulfill')

  // Spending money with suppliers needs an explicit owner action unless auto mode is on.
  if (getFulfillmentMode() === 'manual' && !opts.approved) {
    await requestApproval(orderId)
    return
  }

  // Atomic claim: only one caller (webhook retry, admin button, cron sweep) can move an
  // order from 'unfulfilled' to 'fulfilling'. Everyone else backs off, so supplier
  // orders are never placed twice.
  const { data: claimed, error: claimError } = await supabaseAdmin
    .from('orders')
    .update({ fulfillment_status: 'fulfilling', status: 'processing', updated_at: new Date().toISOString() })
    .eq('id', orderId)
    .eq('payment_status', 'paid')
    .eq('fulfillment_status', 'unfulfilled')
    .select('*')

  if (claimError) throw claimError
  const order = claimed?.[0]
  if (!order) return // already claimed or fulfilled by another run

  await supabaseAdmin.from('agent_logs').insert({
    agent: 'fulfillment',
    action: 'fulfillment_start',
    input: { orderId, orderNumber: order.order_number },
    output: null,
    reasoning: 'Starting fulfillment process',
    success: true,
    duration_ms: 0,
  })

  const manual: ManualItem[] = []
  let autoOrdered = 0

  try {
    const items = order.items as OrderItem[]
    const shippingAddr = buildShippingAddress(order)

    // Split items by supplier type
    const aliItems = items.filter(i => i.supplier === 'aliexpress')
    const cjItems = items.filter(i => i.supplier === 'cj')
    const autoSAItems = items.filter(i => i.supplier in PLAYWRIGHT_SUPPLIERS)
    for (const item of items.filter(i => MANUAL_ONLY_SUPPLIERS.includes(i.supplier))) {
      manual.push({ item, reason: `${item.supplier} has no automatic ordering` })
    }
    // An item whose supplier matches nothing above must never be dropped silently.
    for (const item of items.filter(
      i =>
        i.supplier !== 'aliexpress' &&
        i.supplier !== 'cj' &&
        !(i.supplier in PLAYWRIGHT_SUPPLIERS) &&
        !MANUAL_ONLY_SUPPLIERS.includes(i.supplier)
    )) {
      manual.push({ item, reason: `Unsupported supplier "${item.supplier}"` })
    }

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
            const reason = `Supplier price rose to R${currentPrice.toFixed(2)} (was R${item.supplier_cost.toFixed(2)}); margin below 10%`
            await supabaseAdmin.from('agent_logs').insert({
              agent: 'fulfillment', action: 'price_mismatch',
              input: { orderId, item: item.name, expectedCost: item.supplier_cost, currentCost: currentPrice },
              output: { action: 'skipped_needs_review' },
              reasoning: reason,
              success: false, duration_ms: Date.now() - start,
            })
            manual.push({ item, reason })
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

        if (!supplierOrderId) {
          manual.push({
            item,
            reason: 'AliExpress returned no order id. The order may or may not have been placed: check your AliExpress orders BEFORE ordering again',
          })
          continue
        }

        await supabaseAdmin.from('supplier_orders').insert({
          order_id: orderId, supplier: 'aliexpress',
          supplier_order_id: supplierOrderId.toString(),
          items: [item], total_cost: item.supplier_cost * item.qty,
          shipping_address: shippingAddr, status: 'confirmed',
          placed_at: new Date().toISOString(),
        })
        autoOrdered++
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e)
        await supabaseAdmin.from('agent_logs').insert({
          agent: 'fulfillment', action: 'aliexpress_order_error',
          input: { orderId, item: item.name }, output: null,
          reasoning: errorMessage, success: false, error: errorMessage,
          duration_ms: Date.now() - start,
        })
        manual.push({ item, reason: `AliExpress error: ${errorMessage}` })
      }
    }

    // ── CJ Dropshipping orders (automatic) ─────────────────────────────────
    if (cjItems.length > 0) {
      try {
        const result = await cj.createOrder({
          orderNumber: order.order_number,
          shippingAddress: {
            name: shippingAddr.name, phone: shippingAddr.phone,
            email: shippingAddr.email, address: shippingAddr.address,
            city: shippingAddr.city, province: shippingAddr.province,
            postalCode: shippingAddr.postalCode,
          },
          products: cjItems.map(i => ({
            vid: i.variant_id || i.supplier_product_id,
            quantity: i.qty,
            shippingName: i.shipping_service || 'CJPacket Ordinary',
          })),
        })

        const cjOrderId = result?.data?.orderId
        if (!cjOrderId) {
          for (const item of cjItems) {
            manual.push({
              item,
              reason: 'CJ returned no order id. The order may or may not have been placed: check your CJ orders BEFORE ordering again',
            })
          }
        } else {
          await supabaseAdmin.from('supplier_orders').insert({
            order_id: orderId, supplier: 'cj',
            supplier_order_id: cjOrderId,
            items: cjItems,
            total_cost: cjItems.reduce((sum, i) => sum + i.supplier_cost * i.qty, 0),
            shipping_address: shippingAddr, status: 'confirmed',
            placed_at: new Date().toISOString(),
          })
          autoOrdered += cjItems.length
        }
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e)
        console.error('CJ order error:', e)
        await supabaseAdmin.from('agent_logs').insert({
          agent: 'fulfillment', action: 'cj_order_error',
          input: { orderId }, output: null, success: false,
          error: errorMessage, duration_ms: Date.now() - start,
        })
        for (const item of cjItems) manual.push({ item, reason: `CJ error: ${errorMessage}` })
      }
    }

    // ── Takealot / Makro — Playwright auto-ordering ────────────────────────
    for (const item of autoSAItems) {
      const autoOrder = PLAYWRIGHT_SUPPLIERS[item.supplier]
      const productUrl = item.supplier_product_url || ''

      if (!productUrl) {
        manual.push({ item, reason: 'No product URL stored for automatic ordering' })
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
          autoOrdered++

          await supabaseAdmin.from('agent_logs').insert({
            agent: 'fulfillment', action: `${item.supplier}_auto_order_success`,
            input: { orderId, item: item.name, productUrl },
            output: { orderNumber: result.orderNumber },
            reasoning: `Successfully auto-ordered from ${item.supplier}`,
            success: true, duration_ms: Date.now() - start,
          })
        } else {
          console.error(`${item.supplier} auto-order failed:`, result.error)
          manual.push({ item, reason: `${item.supplier} auto-order failed: ${result.error ?? 'unknown error'}` })

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
        manual.push({ item, reason: `${item.supplier} auto-order error: ${errorMessage}` })
        await supabaseAdmin.from('agent_logs').insert({
          agent: 'fulfillment', action: `${item.supplier}_auto_order_error`,
          input: { orderId, item: item.name }, output: null,
          reasoning: errorMessage, success: false,
          error: errorMessage, duration_ms: Date.now() - start,
        })
      }
    }

    // ── Anything not ordered: record it and tell the owner ──────────────────
    if (manual.length > 0) {
      const bySupplier = new Map<string, ManualItem[]>()
      for (const m of manual) {
        const key = SUPPLIER_ORDER_SUPPLIERS.includes(m.item.supplier) ? m.item.supplier : 'manual'
        bySupplier.set(key, [...(bySupplier.get(key) ?? []), m])
      }
      for (const [supplier, group] of bySupplier) {
        const { error: insertError } = await supabaseAdmin.from('supplier_orders').insert({
          order_id: orderId,
          supplier,
          supplier_order_id: null,
          items: group.map(g => g.item),
          total_cost: group.reduce((sum, g) => sum + g.item.supplier_cost * g.item.qty, 0),
          shipping_address: shippingAddr,
          status: 'needs_manual_order',
          placed_at: new Date().toISOString(),
          notes: group.map(g => `${g.item.name}: ${g.reason}`).join('\n'),
        })
        if (insertError) console.error('needs_manual_order insert failed:', insertError)
      }

      const itemRows = manual
        .map(({ item, reason }) => {
          const name = item.supplier.charAt(0).toUpperCase() + item.supplier.slice(1)
          const url = item.supplier_product_url || `https://www.${item.supplier}.co.za`
          return `• ${item.name} × ${item.qty}\n  Why: ${reason}\n  Buy at: ${name} → ${url}\n  Cost: R${(item.supplier_cost * item.qty).toFixed(2)}`
        })
        .join('\n\n')

      const alerted = await notifyOwner(`⚠️ Action required: order ${order.order_number}`, [
        `Order ${order.order_number} has been PAID but ${manual.length} item(s) were NOT ordered automatically:`,
        itemRows,
        `Ship to: ${shippingAddr.name}, ${shippingAddr.address}, ${shippingAddr.city}, ${shippingAddr.province} ${shippingAddr.postalCode}\nPhone: ${shippingAddr.phone}`,
        `Your profit on this order: R${order.total_profit?.toFixed(2) || '—'}`,
      ])
      if (!alerted) {
        await supabaseAdmin.from('agent_logs').insert({
          agent: 'fulfillment', action: 'owner_alert_failed',
          input: { orderId }, output: { itemCount: manual.length }, success: false,
          error: 'Could not email the owner about items needing manual ordering',
          duration_ms: Date.now() - start,
        })
      }
    }
  } catch (e) {
    // Something unexpected after the claim (bad address, DB error). Make it visible, never leave it 'fulfilling'.
    const message = e instanceof Error ? e.message : String(e)
    await supabaseAdmin
      .from('orders')
      .update({ fulfillment_status: 'needs_attention', updated_at: new Date().toISOString() })
      .eq('id', orderId)
    await supabaseAdmin.from('agent_logs').insert({
      agent: 'fulfillment', action: 'fulfillment_error',
      input: { orderId }, output: null, success: false, error: message,
      duration_ms: Date.now() - start,
    })
    await notifyOwner(`⚠️ Fulfilment failed: order ${order.order_number}`, [
      `Order ${order.order_number} is paid but fulfilment stopped with an error:\n${message}`,
      autoOrdered > 0
        ? `${autoOrdered} item(s) were already ordered from suppliers. Check supplier accounts before re-ordering.`
        : 'Nothing was ordered from suppliers.',
    ])
    throw e
  }

  await supabaseAdmin
    .from('orders')
    .update({
      fulfillment_status: manual.length > 0 ? 'needs_attention' : 'fulfilling',
      status: 'confirmed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)

  // Manual mode already confirmed receipt when the order was queued for approval.
  if (!opts.approved) await sendCustomerConfirmation(order, orderId)

  await supabaseAdmin.from('agent_logs').insert({
    agent: 'fulfillment', action: 'fulfillment_complete',
    input: { orderId },
    output: { status: manual.length > 0 ? 'needs_attention' : 'fulfilling', autoItems: autoOrdered, manualItems: manual.length },
    reasoning: manual.length > 0
      ? 'Fulfillment finished with items needing manual ordering; owner alerted'
      : 'Fulfillment complete — all items ordered automatically',
    success: manual.length === 0, duration_ms: Date.now() - start,
  })
}

export async function checkAndUpdateTracking(): Promise<void> {
  const { data: supplierOrders } = await supabaseAdmin
    .from('supplier_orders')
    .select('*, orders(*)')
    .in('status', ['confirmed', 'placed'])
    .order('placed_at', { ascending: true })
    .limit(200)

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

/**
 * Daily safety net for paid orders that need a human or were never picked up.
 *  - manual mode: orders waiting for approval are never auto-run; the owner gets a digest.
 *  - auto mode: 'unfulfilled' orders (nothing placed with suppliers yet) are retried safely.
 *  - orders stuck in 'fulfilling' may have partially ordered, so they are only reported.
 */
export async function retryUnfulfilledPaidOrders(maxOrders = 10): Promise<{ retried: number; stuck: number; awaitingApproval: number }> {
  const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString()

  const { data: pending } = await supabaseAdmin
    .from('orders')
    .select('id, order_number')
    .eq('payment_status', 'paid')
    .eq('fulfillment_status', 'unfulfilled')
    .lt('updated_at', cutoff)
    .order('created_at', { ascending: true })
    .limit(maxOrders)

  let retried = 0
  let awaitingApproval = 0
  const alerts: string[] = []

  if (getFulfillmentMode() === 'manual') {
    awaitingApproval = pending?.length ?? 0
    if (awaitingApproval > 0) {
      alerts.push(
        `${awaitingApproval} paid order(s) are waiting for your approval: ${pending!.map(o => o.order_number).join(', ')}. Open Admin → Orders → "Approve & order".`
      )
    }
  } else {
    for (const { id } of pending ?? []) {
      try {
        await runFulfillmentAgent(id)
        retried++
      } catch (e) {
        console.error(`Fulfillment retry failed for ${id}:`, e)
      }
    }
  }

  const stuckCutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { data: stuckRows } = await supabaseAdmin
    .from('orders')
    .select('order_number')
    .eq('payment_status', 'paid')
    .eq('fulfillment_status', 'fulfilling')
    .eq('status', 'processing')
    .lt('updated_at', stuckCutoff)
  const stuck = stuckRows?.length ?? 0
  if (stuck > 0) {
    alerts.push(
      `${stuck} paid order(s) have been stuck in "fulfilling" for over an hour: ${stuckRows!.map(o => o.order_number).join(', ')}. Some items may already be ordered: check supplier accounts before re-ordering.`
    )
  }

  const { data: attention } = await supabaseAdmin
    .from('orders')
    .select('order_number')
    .eq('fulfillment_status', 'needs_attention')
    .limit(50)
  if (attention && attention.length > 0) {
    alerts.push(`${attention.length} order(s) need manual action: ${attention.map(o => o.order_number).join(', ')}.`)
  }

  if (alerts.length > 0) await notifyOwner('DropEmpire SA: orders need your attention', alerts)
  return { retried, stuck, awaitingApproval }
}
