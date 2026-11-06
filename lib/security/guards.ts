import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_COOKIE, getAdminSecret, verifyAdminSessionToken } from './admin-session'
import { safeEqual } from './crypto'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

/** Reject cross-site state-changing requests that carry cookie credentials. */
export function isSameOrigin(req: NextRequest): boolean {
  if (SAFE_METHODS.has(req.method)) return true
  const origin = req.headers.get('origin')
  if (!origin) return req.headers.get('sec-fetch-site') !== 'cross-site'
  try {
    return new URL(origin).host === req.headers.get('host')
  } catch {
    return false
  }
}

export function forbiddenOrigin() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

async function hasValidBearer(req: NextRequest, expected: string | undefined | null) {
  if (!expected || expected.length < 16) return false
  const header = req.headers.get('authorization') || ''
  if (!header.startsWith('Bearer ')) return false
  return safeEqual(header.slice(7), expected)
}

async function adminCredentialOk(req: NextRequest): Promise<boolean> {
  // Scripted access: static admin secret in a header.
  const secret = getAdminSecret()
  const headerToken = req.headers.get('x-admin-token')
  if (secret && headerToken && (await safeEqual(headerToken, secret))) return true

  // Browser access: signed, expiring session cookie. Needs CSRF protection.
  const cookie = req.cookies.get(ADMIN_COOKIE)?.value
  return (await verifyAdminSessionToken(cookie)) && isSameOrigin(req)
}

/** Returns an error response if the caller is not an authenticated admin, else null. */
export async function requireAdmin(req: NextRequest): Promise<NextResponse | null> {
  return (await adminCredentialOk(req)) ? null : unauthorized()
}

/** Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. Fails closed if unset. */
export async function requireCron(req: NextRequest): Promise<NextResponse | null> {
  return (await hasValidBearer(req, process.env.CRON_SECRET)) ? null : unauthorized()
}

/** For jobs that run on a schedule but may also be triggered from the admin UI. */
export async function requireAdminOrCron(req: NextRequest): Promise<NextResponse | null> {
  if (await hasValidBearer(req, process.env.CRON_SECRET)) return null
  return requireAdmin(req)
}
