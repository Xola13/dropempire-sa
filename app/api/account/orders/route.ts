import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getVerifiedUser } from '@/lib/account'
import { intParam, noStore, serverError } from '@/lib/http'
import { PUBLIC_ORDER_COLUMNS, toPublicOrder } from '@/lib/orders/public'

const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']

export async function GET(req: NextRequest) {
  try {
    const user = await getVerifiedUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Orders are matched by email, so only a *confirmed* email may read them.
    const email = user.email?.trim().toLowerCase()
    if (!email || !user.email_confirmed_at) {
      return NextResponse.json({ orders: [] }, { headers: noStore })
    }

    const { searchParams } = req.nextUrl
    const limit = intParam(searchParams.get('limit'), 50, 1, 100)
    const statuses = (searchParams.get('status') || '')
      .split(',')
      .map(s => s.trim())
      .filter(s => ORDER_STATUSES.includes(s))

    let query = getSupabaseAdmin()
      .from('orders')
      .select(PUBLIC_ORDER_COLUMNS)
      .eq('customer_email', email)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (statuses.length === 1) query = query.eq('status', statuses[0])
    else if (statuses.length > 1) query = query.in('status', statuses)

    const { data, error } = await query
    if (error) throw error

    // Never return cost/profit/supplier fields to customers.
    const orders = (data ?? []).map(o => toPublicOrder(o as unknown as Record<string, unknown>, { fullAddress: true }))
    return NextResponse.json({ orders }, { headers: noStore })
  } catch (e) {
    return serverError('account/orders', e)
  }
}
