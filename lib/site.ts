/**
 * Canonical public origin of the store (no trailing slash).
 * Used for payment callbacks and email links, so a wrong value in production
 * silently breaks payments. We refuse to guess there.
 */
export function getSiteUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_STORE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : '')

  if (configured) return configured.replace(/\/+$/, '')

  if (process.env.NODE_ENV === 'production') {
    throw new Error('NEXT_PUBLIC_SITE_URL must be set in production')
  }
  return 'http://localhost:3000'
}

export function getSiteHostname(): string {
  return new URL(getSiteUrl()).hostname
}
