import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendEmail } from '@/lib/resend'
import DailyReportEmail from '@/emails/DailyReport'
import React from 'react'

export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000)
      .toISOString()
      .split('T')[0]

    const [todayOrders, yesterdayOrders, failedFulfillments] =
      await Promise.all([
        supabaseAdmin
          .from('orders')
          .select('total, total_profit, status')
          .eq('payment_status', 'paid')
          .gte('created_at', today),
        supabaseAdmin
          .from('orders')
          .select('total')
          .eq('payment_status', 'paid')
          .gte('created_at', yesterday)
          .lt('created_at', today),
        supabaseAdmin
          .from('agent_logs')
          .select('*')
          .eq('agent', 'fulfillment')
          .eq('success', false)
          .gte('created_at', today),
      ])

    const revenue =
      todayOrders.data?.reduce((sum, o) => sum + (o.total || 0), 0) || 0
    const profit =
      todayOrders.data?.reduce(
        (sum, o) => sum + (o.total_profit || 0),
        0
      ) || 0
    const yesterdayRevenue =
      yesterdayOrders.data?.reduce(
        (sum, o) => sum + (o.total || 0),
        0
      ) || 0

    const reportData = {
      date: today,
      revenue,
      profit,
      orders: todayOrders.data?.length || 0,
      yesterdayRevenue,
      failedFulfillments: failedFulfillments.data?.length || 0,
    }

    await supabaseAdmin.from('analytics_daily').upsert({
      date: today,
      revenue,
      cost: revenue - profit,
      profit,
      orders: todayOrders.data?.length || 0,
      new_customers: 0,
    })

    await sendEmail({
      to: process.env.ADMIN_EMAIL!,
      subject: `DropEmpire SA Daily Report — ${today}`,
      react: React.createElement(DailyReportEmail, reportData),
    })

    return NextResponse.json(reportData)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Daily report failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
