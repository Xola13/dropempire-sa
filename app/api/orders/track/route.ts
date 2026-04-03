import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get('order_id')
  const email = req.nextUrl.searchParams.get('email')

  if (!orderId || !email) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select(
      'id, order_number, status, fulfillment_status, tracking_number, tracking_url, courier, estimated_delivery, items, delivery_address, created_at'
    )
    .eq('id', orderId)
    .eq('customer_email', email)
    .single()

  if (error || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  return NextResponse.json(order)
}
