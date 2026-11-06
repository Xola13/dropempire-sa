import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import {
  ADMIN_SESSION_TTL_SECONDS,
  createAdminSessionToken,
  verifyAdminSessionToken,
} from '@/lib/security/admin-session'
import { safeEqual } from '@/lib/security/crypto'
import { isSameOrigin, requireAdmin, requireCron } from '@/lib/security/guards'
import { rateLimit } from '@/lib/security/rate-limit'

const ENV = { ...process.env }
const SECRET = 'a-long-enough-admin-secret-1234'

beforeEach(() => {
  process.env.ADMIN_SECRET = SECRET
  process.env.CRON_SECRET = 'cron-secret-that-is-long-enough'
  delete process.env.ADMIN_SESSION_SECRET
  delete process.env.UPSTASH_REDIS_REST_URL
})
afterEach(() => {
  process.env = { ...ENV }
})

const req = (url: string, init: ConstructorParameters<typeof NextRequest>[1] = {}) =>
  new NextRequest(`https://shop.test${url}`, init)

describe('safeEqual', () => {
  it('matches equal strings and rejects different ones, including different lengths', async () => {
    expect(await safeEqual('abc', 'abc')).toBe(true)
    expect(await safeEqual('abc', 'abd')).toBe(false)
    expect(await safeEqual('abc', 'abcd')).toBe(false)
    expect(await safeEqual('', 'x')).toBe(false)
  })
})

describe('admin session token', () => {
  it('round-trips', async () => {
    const token = await createAdminSessionToken()
    expect(await verifyAdminSessionToken(token)).toBe(true)
  })

  it('never contains the admin password', async () => {
    expect(await createAdminSessionToken()).not.toContain(SECRET)
  })

  it('rejects a tampered signature, payload, and garbage', async () => {
    const token = (await createAdminSessionToken())!
    const parts = token.split('.')
    expect(await verifyAdminSessionToken([...parts.slice(0, 3), 'AAAA'].join('.'))).toBe(false)
    expect(await verifyAdminSessionToken([parts[0], '9999999999999', parts[2], parts[3]].join('.'))).toBe(false)
    expect(await verifyAdminSessionToken('garbage')).toBe(false)
    expect(await verifyAdminSessionToken(undefined)).toBe(false)
  })

  it('expires', async () => {
    const issued = Date.now() - (ADMIN_SESSION_TTL_SECONDS + 1) * 1000
    const token = await createAdminSessionToken(issued)
    expect(await verifyAdminSessionToken(token)).toBe(false)
  })

  it('is invalid after the secret rotates', async () => {
    const token = await createAdminSessionToken()
    process.env.ADMIN_SECRET = 'a-completely-different-secret-99'
    expect(await verifyAdminSessionToken(token)).toBe(false)
  })

  it('fails closed when ADMIN_SECRET is unset or weak', async () => {
    const token = await createAdminSessionToken()
    delete process.env.ADMIN_SECRET
    expect(await createAdminSessionToken()).toBeNull()
    expect(await verifyAdminSessionToken(token)).toBe(false)
    process.env.ADMIN_SECRET = 'short'
    expect(await createAdminSessionToken()).toBeNull()
  })
})

describe('requireAdmin', () => {
  it('rejects anonymous requests', async () => {
    expect((await requireAdmin(req('/api/admin/orders')))?.status).toBe(401)
  })

  it('rejects when ADMIN_SECRET is unset even though no credential was sent (undefined === undefined)', async () => {
    delete process.env.ADMIN_SECRET
    expect((await requireAdmin(req('/api/admin/orders')))?.status).toBe(401)
    expect(
      (await requireAdmin(req('/api/admin/orders', { headers: { 'x-admin-token': 'undefined' } })))?.status
    ).toBe(401)
  })

  it('accepts a valid session cookie', async () => {
    const token = await createAdminSessionToken()
    const r = req('/api/admin/orders', { headers: { cookie: `admin_session=${token}` } })
    expect(await requireAdmin(r)).toBeNull()
  })

  it('rejects the raw admin secret used as a cookie (old scheme)', async () => {
    const r = req('/api/admin/orders', { headers: { cookie: `admin_session=${SECRET}` } })
    expect((await requireAdmin(r))?.status).toBe(401)
  })

  it('accepts the x-admin-token header for scripts', async () => {
    const r = req('/api/admin/orders', { headers: { 'x-admin-token': SECRET } })
    expect(await requireAdmin(r)).toBeNull()
  })

  it('blocks cross-site state-changing requests that rely on the cookie (CSRF)', async () => {
    const token = await createAdminSessionToken()
    const headers = { cookie: `admin_session=${token}`, origin: 'https://evil.test', host: 'shop.test' }
    const r = req('/api/admin/products?id=x', { method: 'PATCH', headers })
    expect((await requireAdmin(r))?.status).toBe(401)
  })
})

describe('requireCron', () => {
  it('accepts the right bearer token', async () => {
    const r = req('/api/cron/x', { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } })
    expect(await requireCron(r)).toBeNull()
  })

  it('rejects wrong tokens and fails closed when CRON_SECRET is unset', async () => {
    expect((await requireCron(req('/api/cron/x', { headers: { authorization: 'Bearer nope' } })))?.status).toBe(401)
    delete process.env.CRON_SECRET
    // The old code compared against the string "Bearer undefined" and let this through.
    expect(
      (await requireCron(req('/api/cron/x', { headers: { authorization: 'Bearer undefined' } })))?.status
    ).toBe(401)
  })
})

describe('isSameOrigin', () => {
  it('allows safe methods and same-origin writes, blocks cross-origin writes', () => {
    expect(isSameOrigin(req('/x'))).toBe(true)
    expect(isSameOrigin(req('/x', { method: 'POST', headers: { origin: 'https://shop.test', host: 'shop.test' } }))).toBe(true)
    expect(isSameOrigin(req('/x', { method: 'POST', headers: { origin: 'https://evil.test', host: 'shop.test' } }))).toBe(false)
    expect(isSameOrigin(req('/x', { method: 'POST', headers: { 'sec-fetch-site': 'cross-site' } }))).toBe(false)
  })
})

describe('rateLimit (in-memory fallback)', () => {
  it('allows up to the limit then blocks, per identifier', async () => {
    const id = `ip-${Math.random()}`
    for (let i = 0; i < 3; i++) expect((await rateLimit('t', id, 3, 60)).allowed).toBe(true)
    const blocked = await rateLimit('t', id, 3, 60)
    expect(blocked.allowed).toBe(false)
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0)
    expect((await rateLimit('t', `other-${Math.random()}`, 3, 60)).allowed).toBe(true)
  })
})
