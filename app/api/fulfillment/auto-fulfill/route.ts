import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { runFulfillmentAgent } from '@/lib/agents/fulfillment-agent'
import { requireAdminOrCron } from '@/lib/security/guards'
import { parseBody, serverError } from '@/lib/http'

export const maxDuration = 300

const Schema = z.object({ orderId: z.string().uuid() }).strict()

/**
 * Approve a paid order and place its supplier orders. Calling this endpoint is the
 * explicit owner action that FULFILLMENT_MODE=manual waits for.
 */
export async function POST(req: NextRequest) {
  const denied = await requireAdminOrCron(req)
  if (denied) return denied

  try {
    const parsed = await parseBody(req, Schema)
    if (!parsed.ok) return parsed.response

    await runFulfillmentAgent(parsed.data.orderId, { approved: true })
    return NextResponse.json({ success: true })
  } catch (e) {
    return serverError('fulfillment/auto-fulfill', e)
  }
}
