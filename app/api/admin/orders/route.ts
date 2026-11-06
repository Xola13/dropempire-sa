import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/security/guards'
import { intParam, noStore, serverError } from '@/lib/http'

const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']
const PAYMENT_STATUSES = ['pending', 'processing', 'paid', 'failed', 'refunded']

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  try {
    const { searchParams } = req.nextUrl
    const page = intParam(searchParams.get('page'), 1, 1, 10_000)
    const limit = 50
    const status = searchParams.get('status')
    const paymentStatus = searchParams.get('payment_status')

    let query = supabaseAdmin
      .from('orders')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (status && ORDER_STATUSES.includes(status)) query = query.eq('status', status)
    if (paymentStatus && PAYMENT_STATUSES.includes(paymentStatus)) {
      query = query.eq('payment_status', paymentStatus)
    }

    const { data, count, error } = await query
    if (error) throw error

    return NextResponse.json({ orders: data, total: count }, { headers: noStore })
  } catch (e) {
    return serverError('admin/orders', e)
  }
}
