import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { AUTH_RETURN_TO_PARAM } from '@876/core/auth/return-to'
import { requestUrl } from '@/lib/auth/request-origin'
import { verifySession876 } from '@/lib/auth/session-cookie'

type SessionSnapshot = {
  userId?: string
  realm?: 'consumer' | 'enterprise'
  crossRealm?: boolean
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

  // Realm hard block: this is the consumer app, for personal accounts only.
  // An enterprise-realm session must NOT be auto-redirected into the other app
  // — show a dedicated access-denied page requiring an explicit account switch.
  // Cross-realm accounts (owner + chosen admins) are exempt and may pass.
  if (session.realm === 'enterprise' && !session.crossRealm) {
    return withRequestId(
      NextResponse.redirect(requestUrl(request, '/access-denied')),
      requestId
    )
  }

  // Authenticated: pass through. All route-level authorization (org membership
  // checks, feature gates) is enforced server-side in RSC layouts and guards.
  return nextWithRequestId(request, requestId)
}

function redirectToLogin(
  request: NextRequest,
  returnTo: string,
  requestId: string
): NextResponse {
  // Embedded auth: this app hosts its own login surface and authenticates
  // directly against the API via the `/api/auth` bridge — no redirect to the
  // centralized auth app.
  const url = requestUrl(request, '/login')
  url.searchParams.set(AUTH_RETURN_TO_PARAM, returnTo)
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
  matcher: ['/app/:path*'],
}
