import { NextResponse } from 'next/server'

// Liveness probe for load balancers / uptime monitors. Deliberately does no I/O
// and returns no configuration or version details.
export const dynamic = 'force-dynamic'

export function GET() {
  return NextResponse.json({ status: 'ok' }, { headers: { 'Cache-Control': 'no-store' } })
}
