import { NextRequest, NextResponse } from 'next/server'
import { checkAndUpdateTracking, retryUnfulfilledPaidOrders } from '@/lib/agents/fulfillment-agent'
import { requireCron } from '@/lib/security/guards'
import { serverError } from '@/lib/http'
import { expireStalePendingOrders } from '@/lib/orders/expire'

export const maxDuration = 300

export async function GET(req: NextRequest) {
  const denied = await requireCron(req)
  if (denied) return denied

  try {
    const recovery = await retryUnfulfilledPaidOrders()
    await checkAndUpdateTracking()
    const expired = await expireStalePendingOrders()
    return NextResponse.json({ success: true, ...recovery, expired })
  } catch (e) {
    return serverError('cron/check-orders', e)
  }
}
