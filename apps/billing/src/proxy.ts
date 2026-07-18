import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { verifySession876 } from '@/lib/auth/session-cookie'

type SessionSnapshot = { userId?: string }

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID()
  const cookieName = process.env.SESSION_COOKIE_NAME ?? '876-session'
  const cookie = request.cookies.get(cookieName)

  if (!cookie?.value) return redirectToLogin(request, requestId)

  const session = (await verifySession876(
    cookie.value
  )) as SessionSnapshot | null
  if (!session?.userId) return redirectToLogin(request, requestId)

  const headers = new Headers(request.headers)
  headers.set('x-request-id', requestId)
  const response = NextResponse.next({ request: { headers } })
  response.headers.set('x-request-id', requestId)
  return response
}

function redirectToLogin(
  request: NextRequest,
  requestId: string
): NextResponse {
  const url = new URL('/login', request.url)
  url.searchParams.set('returnTo', request.nextUrl.pathname)
  const response = NextResponse.redirect(url)
  response.headers.set('x-request-id', requestId)
  return response
}

export const config = {
  matcher: [
    '/((?!api|auth|login|callback|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
}
