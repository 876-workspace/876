import { NextResponse, type NextRequest } from 'next/server'

import {
  AUTH_RETURN_TO_COOKIE,
  resolveRelativeReturnTo,
} from '@876/core/auth/return-to'
import { appendSetCookies, fetchApiBridge } from '@876/core/fetch/bridge'

import { requestUrl } from '@/lib/auth/request-origin'

export const runtime = 'nodejs'

const API_KEY = process.env.API_876_KEY
const DEFAULT_DESTINATION = '/app'

/**
 * GET /callback — WorkOS social-auth landing for the consumer app.
 *
 * Embedded auth derives the WorkOS `redirect_uri` from this app's own origin
 * (`{origin}/callback`), so the provider returns the browser here. We exchange
 * the `code` with the API server-side (`POST /auth/callback`), copy the API's
 * session cookie onto the response (set on THIS app's origin — no cross-origin
 * handoff), clear the return-to cookie, and redirect to the intended page.
 *
 * The `{origin}/callback` URL must be registered in the WorkOS dashboard
 * (Configuration → Redirects) — e.g. `https://*-3000.app.github.dev/callback`.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const oauthError = request.nextUrl.searchParams.get('error')
  if (oauthError) {
    return redirectToLogin(
      request,
      oauthError === 'access_denied'
        ? 'auth/oauth-cancelled'
        : 'auth/oauth-failed'
    )
  }

  const code = request.nextUrl.searchParams.get('code')
  if (!code) return redirectToLogin(request, 'auth/missing-code')

  const returnTo = resolveReturnTo(request)

  let apiResponse: Response
  try {
    apiResponse = await fetchApiBridge('/auth/callback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(API_KEY ? { 'X-876-API-Key': API_KEY } : {}),
      },
      body: JSON.stringify({
        code,
        userAgent: request.headers.get('user-agent') ?? undefined,
      }),
    })
  } catch {
    return redirectToLogin(request, 'auth/oauth-failed')
  }

  if (!apiResponse.ok) return redirectToLogin(request, 'auth/oauth-failed')

  const response = NextResponse.redirect(requestUrl(request, returnTo))
  // Raw header appends — do NOT use response.cookies here or the forwarded
  // 876-session cookie will be dropped by Next's ResponseCookies.
  appendSetCookies(apiResponse, response)
  clearReturnToCookie(response)
  return response
}

function resolveReturnTo(request: NextRequest): string {
  const raw = request.cookies.get(AUTH_RETURN_TO_COOKIE)?.value
  if (!raw) return resolveRelativeReturnTo(undefined, DEFAULT_DESTINATION)
  try {
    return resolveRelativeReturnTo(decodeURIComponent(raw), DEFAULT_DESTINATION)
  } catch {
    return resolveRelativeReturnTo(undefined, DEFAULT_DESTINATION)
  }
}

function redirectToLogin(
  request: NextRequest,
  authError: string
): NextResponse {
  const url = requestUrl(request, '/login')
  url.searchParams.set('authError', authError)
  const response = NextResponse.redirect(url)
  clearReturnToCookie(response)
  return response
}

function clearReturnToCookie(response: NextResponse): void {
  response.headers.append(
    'set-cookie',
    `${AUTH_RETURN_TO_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`
  )
}
