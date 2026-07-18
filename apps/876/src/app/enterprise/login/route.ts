import { NextResponse, type NextRequest } from 'next/server'

import { AUTH_RETURN_TO_PARAM } from '@876/core/auth/return-to'

export const runtime = 'nodejs'

/**
 * GET /enterprise/login — cross-app link to the org workspace's own sign-in.
 *
 * The consumer home page offers an "Enterprise" entry point; this hands the
 * browser off to the enterprise app's embedded `/auth/login`. (Each app now hosts
 * its own auth — there is no central auth app to route through.)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const returnTo = request.nextUrl.searchParams.get(AUTH_RETURN_TO_PARAM) ?? '/'
  const enterpriseOrigin = resolveEnterpriseOrigin(request)
  const loginUrl = new URL('/auth/login', enterpriseOrigin)
  loginUrl.searchParams.set(AUTH_RETURN_TO_PARAM, returnTo)
  return NextResponse.redirect(loginUrl)
}

function resolveEnterpriseOrigin(request: NextRequest): string {
  const configured =
    process.env.NEXT_PUBLIC_ENTERPRISE_URL ?? process.env.NEXT_PUBLIC_ORG_URL
  if (configured && !isLocalOrigin(configured)) return configured
  return getPeerOrigin(request, 3001) ?? configured ?? 'http://localhost:3001'
}

function isLocalOrigin(value: string): boolean {
  try {
    const { hostname } = new URL(value)
    return hostname === 'localhost' || hostname === '127.0.0.1'
  } catch {
    return false
  }
}

/**
 * Rewrites the current request origin to a sibling app's port. Handles
 * Codespaces forwarded hosts (`<name>-3000.app.github.dev` → `-3001`) and plain
 * localhost ports. Returns null when no peer origin can be derived.
 */
function getPeerOrigin(
  request: NextRequest,
  targetPort: number
): string | null {
  try {
    const forwardedHost = request.headers
      .get('x-forwarded-host')
      ?.split(',')[0]
      ?.trim()
    const host = forwardedHost ?? request.headers.get('host')
    if (!host) return null
    const proto =
      request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() ?? 'https'
    const url = new URL(`${proto}://${host}`)
    const hostname = url.hostname.replace(/-\d+(\.)/, `-${targetPort}$1`)
    if (hostname !== url.hostname) {
      url.hostname = hostname
      url.port = ''
      return url.origin
    }
    if (url.port) {
      url.port = String(targetPort)
      return url.origin
    }
    return null
  } catch {
    return null
  }
}
