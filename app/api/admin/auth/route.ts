import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  ADMIN_COOKIE,
  ADMIN_SESSION_TTL_SECONDS,
  createAdminSessionToken,
  getAdminSecret,
} from '@/lib/security/admin-session'
import { safeEqual } from '@/lib/security/crypto'
import { forbiddenOrigin, isSameOrigin } from '@/lib/security/guards'
import { limitByIp, parseBody, serverError } from '@/lib/http'

const Schema = z.object({ password: z.string().min(1).max(256) }).strict()

export async function POST(req: NextRequest) {
  try {
    if (!isSameOrigin(req)) return forbiddenOrigin()

    // Brute-force protection: 5 attempts per 15 minutes per IP.
    const limited = await limitByIp(req, 'admin-login', 5, 15 * 60)
    if (limited) return limited

    const secret = getAdminSecret()
    if (!secret) {
      // Misconfiguration must fail closed, never fall back to an empty password.
      console.error('ADMIN_SECRET is missing or shorter than 16 characters; admin login disabled')
      return NextResponse.json({ error: 'Admin login is not configured' }, { status: 503 })
    }

    const parsed = await parseBody(req, Schema, 1024)
    if (!parsed.ok) return parsed.response

    if (!(await safeEqual(parsed.data.password, secret))) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }

    const token = await createAdminSessionToken()
    if (!token) throw new Error('Could not create admin session')

    const response = NextResponse.json({ success: true })
    response.cookies.set(ADMIN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: ADMIN_SESSION_TTL_SECONDS,
      path: '/',
    })
    response.headers.set('Cache-Control', 'no-store')
    return response
  } catch (e) {
    return serverError('admin/auth', e)
  }
}

export async function DELETE(req: NextRequest) {
  if (!isSameOrigin(req)) return forbiddenOrigin()
  const response = NextResponse.json({ success: true })
  response.cookies.set(ADMIN_COOKIE, '', { path: '/', maxAge: 0 })
  return response
}
