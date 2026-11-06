import { NextRequest, NextResponse, after } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase'
import { confirmITNWithPayFast, verifyITNSignature } from '@/lib/payfast'
import { runFulfillmentAgent } from '@/lib/agents/fulfillment-agent'
import { toCents } from '@/lib/money'
import { safeEqual } from '@/lib/security/crypto'
import { serverError } from '@/lib/http'

// Fulfillment runs after the response is sent; give it room on serverless.
export const maxDuration = 60

const orderIdSchema = z.string().uuid()

function reject(reason: string, orderId?: string) {
  // Never log the raw payload: it contains customer PII.
  console.warn(JSON.stringify({ level: 'warn', scope: 'webhooks/payfast', reason, orderId }))
  return new NextResponse('INVALID', { status: 400 })
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const params: Record<string, string> = {}
    // Insertion order is preserved: PayFast signs fields in the order it sent them.
    form.forEach((value, key) => {
      params[key] = typeof value === 'string' ? value : ''
    })

    // 1. Signature (shared secret)
    if (!(await verifyITNSignature(params))) return reject('bad_signature')

    // 2. Must be addressed to our merchant account
    const merchantId = process.env.PAYFAST_MERCHANT_ID
    if (!merchantId || !(await safeEqual(params.merchant_id ?? '', merchantId))) {
      return reject('merchant_mismatch')
    }

    const idCheck = orderIdSchema.safeParse(params.m_payment_id)
    if (!idCheck.success) return reject('bad_order_id')
    const orderId = idCheck.data

    // 3. Server-to-server confirmation with PayFast
    if (!(await confirmITNWithPayFast(params))) return reject('payfast_rejected', orderId)

    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('id, total, payment_status')
      .eq('id', orderId)
      .maybeSingle()
    if (error) throw error
    if (!order) return reject('order_not_found', orderId)

    // 4. Amount paid must match what we asked for (compared in cents)
    let paidCents: number
    try {
      paidCents = toCents(params.amount_gross)
    } catch {
      return reject('bad_amount', orderId)
    }
    if (paidCents !== toCents(order.total)) {
      console.error(
        JSON.stringify({
          level: 'error',
          scope: 'webhooks/payfast',
          reason: 'amount_mismatch',
          orderId,
          expectedCents: toCents(order.total),
          paidCents,
        })
      )
      return reject('amount_mismatch', orderId)
    }

    if (params.payment_status !== 'COMPLETE') {
      // Only a still-pending order may be marked failed. A paid order is never downgraded.
      if (params.payment_status === 'FAILED' || params.payment_status === 'CANCELLED') {
        await supabaseAdmin
          .from('orders')
          .update({ payment_status: 'failed', updated_at: new Date().toISOString() })
          .eq('id', orderId)
          .eq('payment_status', 'pending')
      }
      return new NextResponse('OK')
    }

    // 5. Idempotent transition: only the first COMPLETE notification wins, so
    //    PayFast retries cannot trigger fulfillment twice.
    const { data: claimed, error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        payment_status: 'paid',
        payment_reference: params.pf_payment_id,
        status: 'confirmed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .in('payment_status', ['pending', 'failed'])
      .select('id')
    if (updateError) throw updateError

    if (claimed && claimed.length > 0) {
      // after() keeps the work alive past the response on serverless platforms.
      after(async () => {
        try {
          await runFulfillmentAgent(orderId)
        } catch (e) {
          console.error(
            JSON.stringify({
              level: 'error',
              scope: 'webhooks/payfast',
              reason: 'fulfillment_failed',
              orderId,
              message: e instanceof Error ? e.message : String(e),
            })
          )
        }
      })
    }

    return new NextResponse('OK')
  } catch (e) {
    // 500 makes PayFast retry the notification.
    return serverError('webhooks/payfast', e)
  }
}
