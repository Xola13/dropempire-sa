import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/security/guards'
import { intParam, noStore } from '@/lib/http'

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  const days = intParam(req.nextUrl.searchParams.get('days'), 30, 1, 365)
  const from = new Date(Date.now() - days * 86400000)
    .toISOString()
    .split('T')[0]

  const [analytics, topProducts, todayStats, agentActivity] =
    await Promise.all([
      supabaseAdmin
        .from('analytics_daily')
        .select('*')
        .gte('date', from)
        .order('date'),
      supabaseAdmin
        .from('products')
        .select('id, name, orders_count, selling_price, margin_percent')
        .order('orders_count', { ascending: false })
        .limit(10),
      supabaseAdmin
        .from('orders')
        .select('total, total_profit, status')
        .eq('payment_status', 'paid')
        .gte('created_at', new Date().toISOString().split('T')[0]),
      supabaseAdmin
        .from('agent_logs')
        .select('agent, action, success, created_at')
        .order('created_at', { ascending: false })
        .limit(20),
    ])

  const todayRevenue =
    todayStats.data?.reduce((sum, o) => sum + (o.total || 0), 0) || 0
  const todayProfit =
    todayStats.data?.reduce((sum, o) => sum + (o.total_profit || 0), 0) || 0

  return NextResponse.json(
    {
    analytics: analytics.data,
    topProducts: topProducts.data,
    today: {
      revenue: todayRevenue,
      profit: todayProfit,
      orders: todayStats.data?.length || 0,
    },
    agentActivity: agentActivity.data,
    },
    { headers: noStore }
  )
}
