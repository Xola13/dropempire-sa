import { NextRequest, NextResponse } from 'next/server'
import { runTrendScoutAgent } from '@/lib/agents/trend-scout-agent'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const trends = await runTrendScoutAgent()

    await supabaseAdmin.from('agent_logs').insert({
      agent: 'trend-scout-cron',
      action: 'weekly_scan',
      input: {},
      output: { trends },
      reasoning: `Found ${trends.length} trending products`,
      success: true,
      duration_ms: 0,
    })

    return NextResponse.json({ trends, count: trends.length })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Trend scout failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
