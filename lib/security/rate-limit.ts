import type { NextRequest } from 'next/server'

/**
 * Fixed-window rate limiter.
 *
 * Production: set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN so limits
 * are shared across all serverless instances. Without them, an in-memory map is
 * used, which only limits per instance (fine for dev, weak on serverless).
 */

interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

const memory = new Map<string, { count: number; resetAt: number }>()
const MEMORY_MAX_KEYS = 10_000

function memoryLimit(key: string, limit: number, windowSeconds: number): RateLimitResult {
  const now = Date.now()
  const entry = memory.get(key)

  if (!entry || entry.resetAt <= now) {
    if (memory.size >= MEMORY_MAX_KEYS) {
      for (const [k, v] of memory) if (v.resetAt <= now) memory.delete(k)
      if (memory.size >= MEMORY_MAX_KEYS) memory.clear()
    }
    memory.set(key, { count: 1, resetAt: now + windowSeconds * 1000 })
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 }
  }

  entry.count++
  return {
    allowed: entry.count <= limit,
    remaining: Math.max(0, limit - entry.count),
    retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000),
  }
}

async function redisLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null

  try {
    const res = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([
        ['INCR', key],
        ['EXPIRE', key, windowSeconds, 'NX'],
        ['TTL', key],
      ]),
      signal: AbortSignal.timeout(1500),
      cache: 'no-store',
    })
    if (!res.ok) return null
    const out = (await res.json()) as Array<{ result: number }>
    const count = out[0]?.result ?? 0
    const ttl = out[2]?.result ?? windowSeconds
    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      retryAfterSeconds: ttl > 0 ? ttl : windowSeconds,
    }
  } catch {
    return null
  }
}

export async function rateLimit(
  bucket: string,
  identifier: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const key = `rl:${bucket}:${identifier}`
  // If Redis is unreachable we degrade to per-instance limiting rather than
  // taking checkout down.
  return (await redisLimit(key, limit, windowSeconds)) ?? memoryLimit(key, limit, windowSeconds)
}

export function getClientIp(req: NextRequest | Request): string {
  const h = req.headers
  const forwarded = h.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return h.get('x-real-ip') || 'unknown'
}
