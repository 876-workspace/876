import 'server-only'

import { unwrapResult } from '@876/core/client/lookup'
import { NextResponse, type NextRequest } from 'next/server'

import { getAuthSession, isSignedSession } from '@/lib/auth/session'
import { getWorkspace } from '@/lib/services/workspace'

export const runtime = 'nodejs'

/**
 * First-party native authorize proxy for the 876 Projects mobile app.
 *
 * Pure transport: the signed-in Enterprise user opens this URL in the system
 * browser, the handler asserts that user (plus their active membership when
 * an org is requested) to Core `/oauth/authorize` with the internal key, and
 * redirects the browser to Core's `redirectTo` — the registered native-scheme
 * callback carrying the authorization code. The mobile app then redeems the
 * code with its PKCE verifier directly at Core `/oauth/token` as a public
 * client, so no secret ever enters the native bundle.
 *
 * Core remains authoritative: it re-validates the exact registered redirect
 * URI, the public-client policy, and the PKCE challenge. The allowlist below
 * only keeps this proxy from becoming an open redirector for arbitrary
 * client ids.
 */
const NATIVE_CLIENTS: ReadonlyArray<{
  clientId: string
  redirectUri: string
}> = [
  {
    clientId: '876_projects_mobile',
    redirectUri: 'com.efesto.projects://oauth/callback',
  },
]

function errorRedirect(redirectUri: string | null, code: string): NextResponse {
  if (redirectUri) {
    const url = new URL(redirectUri)
    url.searchParams.set('error', code)
    return NextResponse.redirect(url.toString())
  }
  return NextResponse.json({ error: code }, { status: 400 })
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const params = request.nextUrl.searchParams
  const clientId = params.get('client_id')?.trim() ?? ''
  const redirectUri = params.get('redirect_uri')?.trim() ?? ''
  const scope =
    params.get('scope')?.trim() ?? 'openid profile email offline_access'
  const codeChallenge = params.get('code_challenge')?.trim() ?? ''
  const codeChallengeMethod =
    params.get('code_challenge_method')?.trim() ?? 'S256'
  const state = params.get('state')?.trim() ?? ''
  const orgId = params.get('org_id')?.trim() || null

  const registered = NATIVE_CLIENTS.find(
    (entry) => entry.clientId === clientId && entry.redirectUri === redirectUri
  )
  if (!registered) return errorRedirect(null, 'invalid_client')

  const session = await getAuthSession()
  if (!isSignedSession(session)) {
    const login = new URL('/login', request.url)
    login.searchParams.set(
      'returnTo',
      request.nextUrl.pathname + request.nextUrl.search
    )
    return NextResponse.redirect(login.toString())
  }

  if (orgId) {
    const client = await getWorkspace()
    const memberships = unwrapResult(
      await client.memberships.list({ status: 'active' }),
      'native authorize memberships'
    ).data
    const member = memberships.some(
      (membership) =>
        membership.organization.id === orgId && membership.status === 'active'
    )
    if (!member) return errorRedirect(redirectUri, 'access_denied')
  }

  const authorize = new URL('/oauth/authorize', process.env.API_URL)
  authorize.searchParams.set('response_type', 'code')
  authorize.searchParams.set('client_id', clientId)
  authorize.searchParams.set('redirect_uri', redirectUri)
  authorize.searchParams.set('scope', scope)
  authorize.searchParams.set('code_challenge', codeChallenge)
  authorize.searchParams.set('code_challenge_method', codeChallengeMethod)
  if (state) authorize.searchParams.set('state', state)

  const apiResponse = await fetch(authorize, {
    headers: {
      'x-internal-key': process.env.API_INTERNAL_KEY ?? '',
      'X-User-Id': session.user.id,
      ...(orgId ? { 'X-Org-Id': orgId } : {}),
    },
  })

  if (!apiResponse.ok) return errorRedirect(redirectUri, 'authorize_failed')

  const body = (await apiResponse.json()) as {
    status?: string
    redirectTo?: string
  }
  if (body.status !== 'authorized' || !body.redirectTo)
    return errorRedirect(redirectUri, 'consent_required')

  return NextResponse.redirect(body.redirectTo)
}
