import { NextRequest, NextResponse } from 'next/server'
import { checkAndUpdateTracking } from '@/lib/agents/fulfillment-agent'

export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await checkAndUpdateTracking()
    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Tracking check failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
