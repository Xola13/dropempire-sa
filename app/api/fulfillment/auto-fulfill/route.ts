import { NextRequest, NextResponse } from 'next/server'
import { runFulfillmentAgent } from '@/lib/agents/fulfillment-agent'
import { requireCron } from '@/lib/security/guards'

export async function POST(req: NextRequest) {
  const denied = await requireCron(req)
  if (denied) return denied

  const { orderId } = await req.json()
  if (!orderId) {
    return NextResponse.json({ error: 'orderId required' }, { status: 400 })
  }

  await runFulfillmentAgent(orderId)
  return NextResponse.json({ success: true })
}
