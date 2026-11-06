import { NextRequest, NextResponse } from 'next/server'
import { runTrendScoutAgent } from '@/lib/agents/trend-scout-agent'
import { requireAdmin } from '@/lib/security/guards'
import { serverError } from '@/lib/http'

export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  try {
    const trends = await runTrendScoutAgent()
    return NextResponse.json({ trends })
  } catch (e) {
    return serverError('ai/trend-scout', e)
  }
}
