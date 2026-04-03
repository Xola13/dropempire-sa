import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = getSupabaseAdmin()

    // Get customer email for this auth user
    const { data: customer } = await admin
      .from('customers')
      .select('email')
      .or(`auth_user_id.eq.${session.user.id},email.eq.${session.user.email}`)
      .maybeSingle()

    const customerEmail = customer?.email || session.user.email

    if (!customerEmail) {
      return NextResponse.json({ orders: [] })
    }

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const statusParam = searchParams.get('status') || ''

    let query = admin
      .from('orders')
      .select('*')
      .eq('customer_email', customerEmail.toLowerCase())
      .order('created_at', { ascending: false })
      .limit(Math.min(limit, 100))

    // Filter by status if provided (comma-separated values)
    if (statusParam) {
      const statuses = statusParam.split(',').map(s => s.trim()).filter(Boolean)
      if (statuses.length === 1) {
        query = query.eq('status', statuses[0])
      } else if (statuses.length > 1) {
        query = query.in('status', statuses)
      }
    }

    const { data: orders, error } = await query

    if (error) {
      console.error('[account/orders GET] query error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ orders: orders || [] })
  } catch (err) {
    console.error('[account/orders GET] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
