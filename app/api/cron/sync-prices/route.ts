import { NextRequest, NextResponse } from 'next/server'
import { runPricingAgent } from '@/lib/agents/pricing-agent'
import { requireCron } from '@/lib/security/guards'
import { serverError } from '@/lib/http'

export const maxDuration = 300

export async function GET(req: NextRequest) {
  const denied = await requireCron(req)
  if (denied) return denied

  try {
    const result = await runPricingAgent()
    return NextResponse.json(result)
  } catch (e) {
    return serverError('cron/sync-prices', e)
  }
}
