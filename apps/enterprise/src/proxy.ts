import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { AUTH_RETURN_TO_PARAM } from '@876/core/auth/return-to'
import { getRequestOrigin } from '@/lib/auth/request-origin'
import { verifySession876 } from '@/lib/auth/session-cookie'

type SessionSnapshot = {
  userId?: string
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl
  const requestId = getRequestId(request)

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

  // Coarse gate only: a signed-in session passes. The enterprise realm check
  // (enterprise-only, cross-realm exempt) needs the Node runtime and lives in
  // the RSC guards (`requireSession`), matching Console/Couriers — the Edge
  // proxy never realm-gates.
  return nextWithRequestId(request, requestId)
}

function redirectToLogin(
  request: NextRequest,
  returnTo: string,
  requestId: string
): NextResponse {
  const loginUrl = new URL('/login', getRequestOrigin(request))
  loginUrl.searchParams.set(AUTH_RETURN_TO_PARAM, returnTo)
  return withRequestId(NextResponse.redirect(loginUrl), requestId)
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
    // Public auth surfaces must stay unguarded: `login` + `register`
    // (business onboarding) are reached signed-out, and `callback` (WorkOS
    // social landing) sets the session cookie itself — guarding it would
    // bounce the round-trip back to /login. `auth` covers /auth/complete.
    // `access-denied` stays session-gated (like Console): the RSC realm guard
    // redirects a signed-in wrong-realm session there.
    '/((?!api|auth|login|register|callback|_next/static|_next/image|favicon.ico).*)',
  ],
}
