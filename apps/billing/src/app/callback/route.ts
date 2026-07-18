import {
  AUTH_RETURN_TO_COOKIE,
  resolveRelativeReturnTo,
} from '@876/core/auth/return-to'
import { appendSetCookies, fetchApiBridge } from '@876/core/fetch/bridge'
import { NextResponse, type NextRequest } from 'next/server'

import { requestUrl } from '@/lib/auth/request-origin'

export const runtime = 'nodejs'

const API_KEY = process.env.BILLING_API_876_KEY

export async function GET(request: NextRequest): Promise<NextResponse> {
  const oauthError = request.nextUrl.searchParams.get('error')
  if (oauthError) return redirectToLogin(request, 'auth/oauth-failed')

  const code = request.nextUrl.searchParams.get('code')
  if (!code) return redirectToLogin(request, 'auth/missing-code')

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

  const response = NextResponse.redirect(
    requestUrl(request, resolveReturnTo(request))
  )
  appendSetCookies(apiResponse, response)
  clearReturnToCookie(response)
  return response
}

function resolveReturnTo(request: NextRequest): string {
  const raw = request.cookies.get(AUTH_RETURN_TO_COOKIE)?.value
  if (!raw) return '/'

  try {
    return resolveRelativeReturnTo(decodeURIComponent(raw), '/')
  } catch {
    return '/'
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
