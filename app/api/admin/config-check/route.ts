import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/security/guards'
import { checkEnv } from '@/lib/env-check'
import { noStore } from '@/lib/http'

// Go-live check: open /api/admin/config-check while signed in as admin. Reports which
// settings are missing or unsafe in THIS deployment's environment. Never returns values.
export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied
  return NextResponse.json(checkEnv(), { headers: noStore })
}
