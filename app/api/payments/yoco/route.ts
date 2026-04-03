import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createYocoCharge } from '@/lib/yoco'
import { runFulfillmentAgent } from '@/lib/agents/fulfillment-agent'

export async function POST(req: NextRequest) {
  try {
    const { token, orderId } = await req.json()
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const charge = await createYocoCharge({
      token,
      amountInCents: Math.round(order.total * 100),
      currency: 'ZAR',
      metadata: {
        orderId: order.id,
        orderNumber: order.order_number,
      },
    })

    if (charge.status === 'successful') {
      await supabaseAdmin
        .from('orders')
        .update({
          payment_status: 'paid',
          payment_reference: charge.id,
          status: 'confirmed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)

      runFulfillmentAgent(orderId).catch(console.error)

      return NextResponse.json({ success: true, chargeId: charge.id })
    }

    return NextResponse.json({ error: 'Payment failed' }, { status: 400 })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Payment failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
