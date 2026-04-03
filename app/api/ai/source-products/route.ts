import { NextRequest, NextResponse } from 'next/server'
import { runSourcingAgent } from '@/lib/agents/sourcing-agent'

export async function POST(req: NextRequest) {
  try {
    const { keyword } = await req.json()
    if (!keyword) {
      return NextResponse.json({ error: 'keyword required' }, { status: 400 })
    }
    const result = await runSourcingAgent(keyword)
    return NextResponse.json(result)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Sourcing failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
