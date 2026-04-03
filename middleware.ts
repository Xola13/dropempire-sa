import { NextRequest, NextResponse } from 'next/server'

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname

  // Admin protection (cookie-based session)
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    const adminCookie = req.cookies.get('admin_session')
    if (!adminCookie || adminCookie.value !== process.env.ADMIN_SECRET) {
      return NextResponse.redirect(new URL('/admin/login', req.url))
    }
  }

  // Account route protection (except login / signup / forgot-password)
  if (
    pathname.startsWith('/account') &&
    !pathname.startsWith('/account/login') &&
    !pathname.startsWith('/account/signup') &&
    !pathname.startsWith('/account/forgot-password')
  ) {
    // Supabase SSR stores the session in a cookie named sb-<project-ref>-auth-token
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const projectRef = supabaseUrl.split('//')[1]?.split('.')[0] || ''
    const cookieName = `sb-${projectRef}-auth-token`

    const supabaseCookie =
      req.cookies.get(cookieName) ||
      req.cookies.get('sb-access-token') ||
      // Accept chunked cookie pattern used by @supabase/ssr v0.4+
      req.cookies.get(`${cookieName}.0`)

    if (!supabaseCookie) {
      const loginUrl = new URL('/account/login', req.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/account/:path*'],
}
