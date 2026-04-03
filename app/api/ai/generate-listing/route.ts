import { NextRequest, NextResponse } from 'next/server'
import { runListingAgent } from '@/lib/agents/listing-agent'

export async function POST(req: NextRequest) {
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
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Listing generation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
