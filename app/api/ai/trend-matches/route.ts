import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/security/guards'
import { matchTrendToLocal } from '@/lib/suppliers/trend-match'
import { serverError } from '@/lib/http'

export const maxDuration = 60

const Body = z.object({ keyword: z.string().trim().min(2).max(120) })

export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'keyword is required' }, { status: 400 })

  try {
    return NextResponse.json(await matchTrendToLocal(parsed.data.keyword))
  } catch (e) {
    return serverError('ai/trend-matches', e)
  }
}
