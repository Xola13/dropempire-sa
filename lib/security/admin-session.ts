import { hmacSha256, randomToken, safeEqual } from './crypto'

export const ADMIN_COOKIE = 'admin_session'
export const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 8 // 8 hours

const MIN_SECRET_LENGTH = 16

/** The admin password. Returns null when unset or too weak, so callers fail closed. */
export function getAdminSecret(): string | null {
  const secret = process.env.ADMIN_SECRET
  if (!secret || secret.length < MIN_SECRET_LENGTH) return null
  return secret
}

// The signing key is derived from, but is not equal to, the admin password,
// so a leaked cookie never reveals the password.
function signingKey(secret: string): string {
  return `${process.env.ADMIN_SESSION_SECRET || secret}:admin-session:v1`
}

/** Issue a signed, expiring session token: `v1.<expiresAtMs>.<nonce>.<signature>`. */
export async function createAdminSessionToken(now = Date.now()): Promise<string | null> {
  const secret = getAdminSecret()
  if (!secret) return null
  const expires = now + ADMIN_SESSION_TTL_SECONDS * 1000
  const payload = `v1.${expires}.${randomToken(12)}`
  return `${payload}.${await hmacSha256(signingKey(secret), payload)}`
}

export async function verifyAdminSessionToken(
  token: string | undefined | null,
  now = Date.now()
): Promise<boolean> {
  const secret = getAdminSecret()
  if (!secret || !token) return false

  const parts = token.split('.')
  if (parts.length !== 4 || parts[0] !== 'v1') return false

  const expires = Number(parts[1])
  if (!Number.isFinite(expires) || expires < now) return false

  const payload = parts.slice(0, 3).join('.')
  const expected = await hmacSha256(signingKey(secret), payload)
  return safeEqual(parts[3], expected)
}
