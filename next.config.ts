import type { NextConfig } from 'next'

const isDev = process.env.NODE_ENV !== 'production'

function supabaseOrigins(): { http: string; ws: string } | null {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || '')
    return { http: url.origin, ws: `wss://${url.host}` }
  } catch {
    return null
  }
}

const supabase = supabaseOrigins()

// Content-Security-Policy.
// 'unsafe-inline' for scripts is required by Next's inline bootstrap/hydration data unless
// a per-request nonce is used; a nonce would force every page to render dynamically, which
// defeats the CDN/ISR caching this store relies on at scale. Everything else is locked down:
// no plugins, no framing, no foreign form targets, no <base> hijacking.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://js.yoco.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${supabase ? `${supabase.http} ${supabase.ws}` : 'https://*.supabase.co wss://*.supabase.co'} https://online.yoco.com${isDev ? ' ws://localhost:*' : ''}`,
  'frame-src https://payments.yoco.com https://js.yoco.com',
  "form-action 'self' https://www.payfast.co.za https://sandbox.payfast.co.za https://*.yoco.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(self)' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
]

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false, // don't advertise the framework
  compress: true,

  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24, // cache optimised images for a day
    remotePatterns: [
      { protocol: 'https', hostname: '**.aliexpress.com' },
      { protocol: 'https', hostname: '**.alicdn.com' },
      { protocol: 'https', hostname: '**.cjdropshipping.com' },
      { protocol: 'https', hostname: '**.makro.co.za' },
      { protocol: 'https', hostname: '**.game.co.za' },
      { protocol: 'https', hostname: '**.bidorbuy.co.za' },
      { protocol: 'https', hostname: '**.bob-media.co.za' },
      { protocol: 'https', hostname: '**.takealot.com' },
      { protocol: 'https', hostname: 'media.takealot.com' },
      { protocol: 'https', hostname: 'cdn.takealot.com' },
      { protocol: 'https', hostname: '**.hivve.co.za' },
      { protocol: 'https', hostname: 'cdn.shopify.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },

  serverExternalPackages: ['playwright'],

  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      {
        // Never let a shared cache store admin or account API responses.
        source: '/api/(admin|account)/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store' }],
      },
    ]
  },
}

export default nextConfig
