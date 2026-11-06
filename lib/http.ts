import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { z } from 'zod'
import { getClientIp, rateLimit } from '@/lib/security/rate-limit'

const DEFAULT_MAX_BODY_BYTES = 64 * 1024

type Parsed<T> = { ok: true; data: T } | { ok: false; response: NextResponse }

/** Read and validate a JSON body with a hard size cap. */
export async function parseBody<S extends z.ZodTypeAny>(
  req: NextRequest,
  schema: S,
  maxBytes = DEFAULT_MAX_BODY_BYTES
): Promise<Parsed<z.infer<S>>> {
  const declared = Number(req.headers.get('content-length') || 0)
  if (declared > maxBytes) {
    return { ok: false, response: NextResponse.json({ error: 'Payload too large' }, { status: 413 }) }
  }

  let raw: unknown
  try {
    const text = await req.text()
    if (text.length > maxBytes) {
      return { ok: false, response: NextResponse.json({ error: 'Payload too large' }, { status: 413 }) }
    }
    raw = JSON.parse(text)
  } catch {
    return { ok: false, response: NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }
  }

  const result = schema.safeParse(raw)
  if (!result.success) {
    const issues = result.error.issues.map(i => ({ path: i.path.join('.'), message: i.message }))
    return { ok: false, response: NextResponse.json({ error: 'Validation failed', issues }, { status: 400 }) }
  }
  return { ok: true, data: result.data }
}

/** Returns a 429 response when the caller is over the limit, else null. */
export async function limitByIp(
  req: NextRequest,
  bucket: string,
  limit: number,
  windowSeconds: number
): Promise<NextResponse | null> {
  const result = await rateLimit(bucket, getClientIp(req), limit, windowSeconds)
  if (result.allowed) return null
  return NextResponse.json(
    { error: 'Too many requests. Please try again shortly.' },
    { status: 429, headers: { 'Retry-After': String(result.retryAfterSeconds || windowSeconds) } }
  )
}

/**
 * Log the real error server-side and return an opaque 500 so internals
 * (SQL errors, stack traces, upstream messages) never reach the client.
 */
export function serverError(scope: string, err: unknown, status = 500): NextResponse {
  const requestId = randomUUID()
  console.error(
    JSON.stringify({
      level: 'error',
      scope,
      requestId,
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    })
  )
  return NextResponse.json({ error: 'Something went wrong', requestId }, { status })
}

/** Clamp a user-supplied integer query param. */
export function intParam(value: string | null, fallback: number, min: number, max: number): number {
  const n = Number.parseInt(value ?? '', 10)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

export const noStore = { 'Cache-Control': 'no-store' } as const
