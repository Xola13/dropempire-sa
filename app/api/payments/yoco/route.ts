import { NextRequest, NextResponse, after } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase'
import { createYocoCharge, YocoDeclinedError } from '@/lib/yoco'
import { runFulfillmentAgent } from '@/lib/agents/fulfillment-agent'
import { toCents } from '@/lib/money'
import { limitByIp, parseBody, serverError } from '@/lib/http'

export const maxDuration = 60

const Schema = z
  .object({
    token: z.string().min(1).max(200),
    orderId: z.string().uuid(),
  })
  .strict()

export async function POST(req: NextRequest) {
  let claimedOrderId: string | null = null
  if (process.env.NEXT_PUBLIC_YOCO_ENABLED !== 'true') {
    return NextResponse.json({ error: 'This payment method is not available' }, { status: 503 })
  }
  try {
    const limited = await limitByIp(req, 'yoco', 10, 60)
    if (limited) return limited

    const parsed = await parseBody(req, Schema)
    if (!parsed.ok) return parsed.response
    const { token, orderId } = parsed.data

    // Atomically claim the order: pending -> processing. If two requests race
    // (double click, replay), only one gets the row, so the card is charged once.
    const { data: claimed, error: claimError } = await supabaseAdmin
      .from('orders')
      .update({ payment_status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .in('payment_status', ['pending', 'failed']) // a declined card may retry
      .eq('payment_method', 'yoco')
      .select('id, order_number, total')
    if (claimError) throw claimError

    const order = claimed?.[0]
    if (!order) {
      return NextResponse.json({ error: 'Order not found or already paid' }, { status: 409 })
    }
    claimedOrderId = order.id

    // Amount is taken from our database, never from the client.
    const charge = await createYocoCharge({
      token,
      amountInCents: toCents(order.total),
      currency: 'ZAR',
      metadata: { orderId: order.id, orderNumber: order.order_number },
      idempotencyKey: order.id,
    })

    if (charge.status !== 'successful') {
      await supabaseAdmin
        .from('orders')
        .update({ payment_status: 'failed', updated_at: new Date().toISOString() })
        .eq('id', order.id)
      return NextResponse.json({ error: 'Payment was declined' }, { status: 402 })
    }

    await supabaseAdmin
      .from('orders')
      .update({
        payment_status: 'paid',
        payment_reference: charge.id,
        status: 'confirmed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)

    after(async () => {
      try {
        await runFulfillmentAgent(order.id)
      } catch (e) {
        console.error(
          JSON.stringify({
            level: 'error',
            scope: 'payments/yoco',
            reason: 'fulfillment_failed',
            orderId: order.id,
            message: e instanceof Error ? e.message : String(e),
          })
        )
      }
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    if (claimedOrderId && e instanceof YocoDeclinedError) {
      // Gateway refused: no money moved, the customer may try another card.
      await supabaseAdmin
        .from('orders')
        .update({ payment_status: 'failed', updated_at: new Date().toISOString() })
        .eq('id', claimedOrderId)
        .eq('payment_status', 'processing')
      return NextResponse.json({ error: 'Payment was declined' }, { status: 402 })
    }
    // Timeout / network error: the charge may or may not have gone through. Leave the
    // order in 'processing' for reconciliation instead of risking a second charge.
    return serverError('payments/yoco', e)
  }
}
