import { NextResponse } from 'next/server'
import { runTrendScoutAgent } from '@/lib/agents/trend-scout-agent'

export async function POST() {
  try {
    const trends = await runTrendScoutAgent()
    return NextResponse.json({ trends })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Trend scout failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
