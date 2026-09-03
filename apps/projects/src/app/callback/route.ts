import { AUTH_CALLBACK_ERROR_PARAM } from '@876/core/auth/callback-error'
import { hasEstablishedSession } from '@876/core/auth/callback-session'
import {
  AUTH_RETURN_TO_COOKIE,
  resolveRelativeReturnTo,
} from '@876/core/auth/return-to'
import { appendSetCookies, fetchApiBridge } from '@876/core/fetch/bridge'
import { NextResponse, type NextRequest } from 'next/server'

import { requestUrl } from '@/lib/auth/request-origin'

export const runtime = 'nodejs'

const API_KEY = process.env.PROJECTS_API_876_KEY
const DEFAULT_DESTINATION = '/auth/complete'

/**
 * GET /callback — the social-auth landing for 876 Projects.
 *
 * Embedded auth derives the provider `redirect_uri` from this app's own origin
 * (`{origin}/callback`), so the browser comes back here with a `code`. We
 * exchange it with the API server-side, copy the API's session cookie onto the
 * response (set on THIS app's origin), and redirect into the workspace.
 *
 * The route is deliberately **idempotent**: an authorization code is single-use,
 * and mobile browsers request this URL more than once often enough that a
 * duplicate hit was undoing an otherwise successful sign-in. See
 * `@876/core/auth/callback-session` for why.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const returnTo = resolveReturnTo(request)

  const oauthError = request.nextUrl.searchParams.get('error')
  if (oauthError) {
    return redirectToLogin(
      request,
      oauthError === 'access_denied'
        ? 'auth/oauth-cancelled'
        : 'auth/oauth-failed',
      returnTo
    )
  }

  const code = request.nextUrl.searchParams.get('code')

  // A repeat request carries the cookie the first one set. Both the missing
  // code and the spent code land here, and in both cases the user is already
  // signed in — sending them to /login would sign them back out.
  if (await hasEstablishedSession(request))
    return continueIntoApp(request, returnTo)

  if (!code) return redirectToLogin(request, 'auth/missing-code', returnTo)

  let apiResponse: Response
  try {
    apiResponse = await fetchApiBridge('/auth/callback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Must match the realm `/api/auth/*` signs in with. The API defaults an
        // absent `X-876-Realm` to `consumer`; Projects is an org workspace.
        'X-876-Realm': 'enterprise',
        ...(API_KEY ? { 'X-876-API-Key': API_KEY } : {}),
      },
      body: JSON.stringify({
        code,
        userAgent: request.headers.get('user-agent') ?? undefined,
      }),
    })
  } catch {
    return redirectToLogin(request, 'auth/oauth-failed', returnTo)
  }

  if (!apiResponse.ok)
    return redirectToLogin(request, 'auth/oauth-failed', returnTo)

  const response = continueIntoApp(request, returnTo)
  // Raw header appends — do NOT use response.cookies here or the forwarded
  // 876-session cookie will be dropped by Next's ResponseCookies.
  appendSetCookies(apiResponse, response)
  return response
}

function continueIntoApp(request: NextRequest, returnTo: string): NextResponse {
  const response = NextResponse.redirect(requestUrl(request, returnTo))
  clearReturnToCookie(response)
  return response
}

function resolveReturnTo(request: NextRequest): string {
  const raw = request.cookies.get(AUTH_RETURN_TO_COOKIE)?.value
  if (!raw) return DEFAULT_DESTINATION

  try {
    return resolveRelativeReturnTo(decodeURIComponent(raw), DEFAULT_DESTINATION)
  } catch {
    return DEFAULT_DESTINATION
  }
}

function redirectToLogin(
  request: NextRequest,
  authError: string,
  returnTo: string
): NextResponse {
  const url = requestUrl(request, '/login')
  url.searchParams.set(AUTH_CALLBACK_ERROR_PARAM, authError)
  // Keep the destination the user was originally headed for, so retrying the
  // sign-in still lands them where they meant to go.
  if (returnTo !== DEFAULT_DESTINATION)
    url.searchParams.set('returnTo', returnTo)

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
