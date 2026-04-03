import { NextRequest, NextResponse } from 'next/server'
import { runPricingAgent } from '@/lib/agents/pricing-agent'

export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runPricingAgent()
    return NextResponse.json(result)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Price sync failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
