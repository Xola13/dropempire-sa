import { NextRequest, NextResponse } from 'next/server'
import { runTrendScoutAgent } from '@/lib/agents/trend-scout-agent'
import { supabaseAdmin } from '@/lib/supabase'
import { requireCron } from '@/lib/security/guards'
import { serverError } from '@/lib/http'

export const maxDuration = 300

export async function GET(req: NextRequest) {
  const denied = await requireCron(req)
  if (denied) return denied

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
  } catch (e) {
    return serverError('cron/trend-scout', e)
  }
}
