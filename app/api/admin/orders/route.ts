import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

function checkAdminAuth(req: NextRequest): boolean {
  const cookie = req.cookies.get('admin_session')
  const header = req.headers.get('x-admin-token')
  return cookie?.value === process.env.ADMIN_SECRET || header === process.env.ADMIN_SECRET
}

export async function GET(req: NextRequest) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const page = parseInt(searchParams.get('page') || '1')
  const limit = 50
  const status = searchParams.get('status')
  const paymentStatus = searchParams.get('payment_status')

  let query = supabaseAdmin
    .from('orders')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  if (status) query = query.eq('status', status)
  if (paymentStatus) query = query.eq('payment_status', paymentStatus)

  const { data, count, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ orders: data, total: count })
}
