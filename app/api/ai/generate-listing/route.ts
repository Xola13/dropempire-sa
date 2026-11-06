import { NextRequest, NextResponse } from 'next/server'
import { runListingAgent } from '@/lib/agents/listing-agent'
import { requireAdmin } from '@/lib/security/guards'
import { serverError } from '@/lib/http'

export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  try {
    const data = await req.json()

    if (!data.name || !data.price || !data.deliveryDays || !data.supplier) {
      return NextResponse.json(
        { error: 'name, price, deliveryDays, and supplier are required' },
        { status: 400 }
      )
    }

    const listing = await runListingAgent(data)
    return NextResponse.json(listing)
  } catch (e) {
    return serverError('ai/generate-listing', e)
  }
}
