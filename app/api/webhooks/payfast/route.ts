import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { validateITN } from '@/lib/payfast'
import { runFulfillmentAgent } from '@/lib/agents/fulfillment-agent'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const params: Record<string, string> = {}
    formData.forEach((value, key) => {
      params[key] = value.toString()
    })

    if (!validateITN(params)) {
      console.error('PayFast ITN validation failed', params)
      return new NextResponse('INVALID', { status: 400 })
    }

    const orderId = params.m_payment_id
    const paymentStatus = params.payment_status
    const paymentReference = params.pf_payment_id

    if (paymentStatus !== 'COMPLETE') {
      await supabaseAdmin
        .from('orders')
        .update({
          payment_status: 'failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)
      return new NextResponse('OK')
    }

    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('total')
      .eq('id', orderId)
      .single()

    if (!order) {
      return new NextResponse('ORDER_NOT_FOUND', { status: 404 })
    }

    const paidAmount = parseFloat(params.amount_gross)
    if (Math.abs(paidAmount - order.total) > 0.01) {
      console.error(
        `PayFast amount mismatch: expected ${order.total}, got ${paidAmount}`
      )
      return new NextResponse('AMOUNT_MISMATCH', { status: 400 })
    }

    await supabaseAdmin
      .from('orders')
      .update({
        payment_status: 'paid',
        payment_reference: paymentReference,
        status: 'confirmed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)

    // Trigger fulfillment async — respond to PayFast quickly
    runFulfillmentAgent(orderId).catch(e =>
      console.error('Fulfillment error:', e)
    )

    return new NextResponse('OK')
  } catch (e) {
    console.error('PayFast webhook error:', e)
    return new NextResponse('ERROR', { status: 500 })
  }
}
