import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { verifySession876 } from '@/lib/auth/session-cookie'

type SessionSnapshot = {
  userId?: string
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl
  const requestId = getRequestId(request)

  if (pathname === '/a' || pathname.startsWith('/a/')) {
    const url = request.nextUrl.clone()
    url.pathname = pathname === '/a' ? '/' : pathname.slice(2)
    return withRequestId(NextResponse.redirect(url), requestId)
  }

  const COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? '876-session'
  const cookie = request.cookies.get(COOKIE_NAME)

  if (!cookie?.value) {
    return redirectToLogin(request, pathname, requestId)
  }

  const session = (await verifySession876(
    cookie.value
  )) as SessionSnapshot | null

  if (!session?.userId) {
    return redirectToLogin(request, pathname, requestId)
  }

  return nextWithRequestId(request, requestId)
}

function redirectToLogin(
  request: NextRequest,
  returnTo: string,
  requestId: string
): NextResponse {
  const url = new URL('/login', request.url)
  url.searchParams.set('returnTo', returnTo)
  return withRequestId(NextResponse.redirect(url), requestId)
}

function getRequestId(request: NextRequest): string {
  return request.headers.get('x-request-id') ?? crypto.randomUUID()
}

function nextWithRequestId(
  request: NextRequest,
  requestId: string
): NextResponse {
  const headers = new Headers(request.headers)
  headers.set('x-request-id', requestId)

  return withRequestId(
    NextResponse.next({
      request: { headers },
    }),
    requestId
  )
}

function withRequestId(
  response: NextResponse,
  requestId: string
): NextResponse {
  response.headers.set('x-request-id', requestId)
  return response
}

export const config = {
  matcher: [
    // `callback` (WorkOS social landing) and `auth`/`login`/`api` must stay
    // public — the session cookie is only set once the callback exchanges the
    // code, so guarding it here would bounce the round-trip back to /login.
    '/((?!api|auth|login|callback|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
}
