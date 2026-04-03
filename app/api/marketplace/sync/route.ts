import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getOrders as getTakealotOrders } from '@/lib/marketplace/takealot-seller'
import { getOrders as getMakroOrders } from '@/lib/marketplace/makro-seller'
import { generateOrderNumber } from '@/lib/utils'

export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdmin()
  const synced: string[] = []
  const errors: string[] = []

  try {
    // Fetch orders from both marketplaces in parallel
    const [takealotResult, makroResult] = await Promise.all([
      getTakealotOrders('new').catch(e => ({ orders: [], error: String(e) })),
      getMakroOrders().catch(e => ({ orders: [], error: String(e) })),
    ])

    if ('error' in takealotResult && takealotResult.error && !takealotResult.orders.length) {
      errors.push(`Takealot: ${takealotResult.error}`)
    }
    if ('error' in makroResult && makroResult.error && !makroResult.orders.length) {
      errors.push(`Makro: ${makroResult.error}`)
    }

    // Process Takealot orders
    for (const order of takealotResult.orders) {
      try {
        // Check if already synced
        const { data: existing } = await supabase
          .from('orders')
          .select('id')
          .eq('marketplace_order_id', order.order_id)
          .maybeSingle()

        if (existing) continue

        const items = order.line_items.map(li => ({
          product_id: li.sku,
          name: li.title,
          qty: li.quantity,
          unit_price: li.selling_price,
          supplier_cost: 0,
          supplier: 'takealot',
          supplier_product_id: li.sku,
        }))

        const subtotal = items.reduce((sum, i) => sum + i.unit_price * i.qty, 0)

        const { error: insertError } = await supabase.from('orders').insert({
          order_number: generateOrderNumber(),
          customer_email: order.shipping_address?.email || 'marketplace@takealot.com',
          customer_name: order.shipping_address?.name || 'Takealot Customer',
          customer_phone: order.shipping_address?.phone || null,
          delivery_address: order.shipping_address || {},
          items,
          subtotal,
          shipping_cost: 0,
          total: order.total || subtotal,
          total_cost: 0,
          total_profit: 0,
          payment_method: 'payfast',
          payment_status: 'paid',
          fulfillment_status: 'unfulfilled',
          status: 'confirmed',
          order_source: 'takealot',
          marketplace_order_id: order.order_id,
        })

        if (insertError) {
          errors.push(`Takealot order ${order.order_id}: ${insertError.message}`)
        } else {
          synced.push(`takealot:${order.order_id}`)
        }
      } catch (e) {
        errors.push(`Takealot order ${order.order_id}: ${String(e)}`)
      }
    }

    // Process Makro orders
    for (const order of makroResult.orders) {
      try {
        const { data: existing } = await supabase
          .from('orders')
          .select('id')
          .eq('marketplace_order_id', order.order_id)
          .maybeSingle()

        if (existing) continue

        const items = order.line_items.map(li => ({
          product_id: li.sku,
          name: li.title,
          qty: li.quantity,
          unit_price: li.price,
          supplier_cost: 0,
          supplier: 'makro',
          supplier_product_id: li.sku,
        }))

        const subtotal = items.reduce((sum, i) => sum + i.unit_price * i.qty, 0)

        const { error: insertError } = await supabase.from('orders').insert({
          order_number: generateOrderNumber(),
          customer_email: order.shipping_address?.email || 'marketplace@makro.co.za',
          customer_name: order.customer_name || 'Makro Customer',
          customer_phone: order.shipping_address?.phone || null,
          delivery_address: order.shipping_address || {},
          items,
          subtotal,
          shipping_cost: 0,
          total: order.total || subtotal,
          total_cost: 0,
          total_profit: 0,
          payment_method: 'payfast',
          payment_status: 'paid',
          fulfillment_status: 'unfulfilled',
          status: 'confirmed',
          order_source: 'makro',
          marketplace_order_id: order.order_id,
        })

        if (insertError) {
          errors.push(`Makro order ${order.order_id}: ${insertError.message}`)
        } else {
          synced.push(`makro:${order.order_id}`)
        }
      } catch (e) {
        errors.push(`Makro order ${order.order_id}: ${String(e)}`)
      }
    }

    return NextResponse.json({
      success: true,
      synced: synced.length,
      syncedIds: synced,
      errors: errors.length > 0 ? errors : undefined,
      message: `Synced ${synced.length} new marketplace order${synced.length !== 1 ? 's' : ''}`,
    })
  } catch (err) {
    console.error('[marketplace/sync] error:', err)
    return NextResponse.json(
      { error: 'Failed to sync marketplace orders', synced: 0 },
      { status: 500 }
    )
  }
}
