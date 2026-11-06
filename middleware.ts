import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_COOKIE, verifyAdminSessionToken } from '@/lib/security/admin-session'

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname

  // Admin UI: requires a valid, unexpired, signed session cookie.
  // (API routes under /api/admin re-check on every request; this is the page gate.)
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    const token = req.cookies.get(ADMIN_COOKIE)?.value
    if (!(await verifyAdminSessionToken(token))) {
      const res = NextResponse.redirect(new URL('/admin/login', req.url))
      res.cookies.delete(ADMIN_COOKIE)
      return res
    }
  }

  // Account pages: UX-level redirect only. The /api/account routes verify the
  // Supabase session with the auth server (getUser), which is what actually
  // protects customer data.
  if (
    pathname.startsWith('/account') &&
    !pathname.startsWith('/account/login') &&
    !pathname.startsWith('/account/signup') &&
    !pathname.startsWith('/account/forgot-password')
  ) {
    const hasSupabaseCookie = req.cookies
      .getAll()
      .some(c => c.name.startsWith('sb-') && c.name.includes('-auth-token'))

    if (!hasSupabaseCookie) {
      const loginUrl = new URL('/account/login', req.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  const res = NextResponse.next()
  if (pathname.startsWith('/admin')) {
    res.headers.set('Cache-Control', 'no-store')
    res.headers.set('X-Robots-Tag', 'noindex, nofollow')
  }
  return res
}

export const config = {
  matcher: ['/admin/:path*', '/account/:path*'],
}
