import { NextRequest, NextResponse } from 'next/server'
import { runSourcingAgent } from '@/lib/agents/sourcing-agent'
import { requireAdmin } from '@/lib/security/guards'
import { serverError } from '@/lib/http'

export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  try {
    const { keyword } = await req.json()
    if (!keyword) {
      return NextResponse.json({ error: 'keyword required' }, { status: 400 })
    }
    const result = await runSourcingAgent(keyword)
    return NextResponse.json(result)
  } catch (e) {
    return serverError('ai/source-products', e)
  }
}
