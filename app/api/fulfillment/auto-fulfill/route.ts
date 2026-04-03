import { NextRequest, NextResponse } from 'next/server'
import { runFulfillmentAgent } from '@/lib/agents/fulfillment-agent'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { orderId } = await req.json()
  if (!orderId) {
    return NextResponse.json({ error: 'orderId required' }, { status: 400 })
  }

  await runFulfillmentAgent(orderId)
  return NextResponse.json({ success: true })
}
