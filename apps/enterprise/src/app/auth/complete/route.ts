import { redirect } from 'next/navigation'
import type { NextRequest } from 'next/server'

import {
  AUTH_RETURN_TO_PARAM,
  createAuthLoginPath,
  resolveRelativeReturnTo,
} from '@876/core/auth/return-to'

import { getAuthSession, isSignedSession } from '@/lib/auth/session'

export const runtime = 'nodejs'

/**
 * GET /auth/complete — post-auth landing. Reads the cookie the `/api/auth`
 * bridge just set and redirects to an open-redirect-safe relative
 * destination, falling back to `/login` when the session is missing.
 */
export async function GET(request: NextRequest) {
  const returnTo = resolveRelativeReturnTo(
    request.nextUrl.searchParams.get(AUTH_RETURN_TO_PARAM),
    '/'
  )

  const result = await getAuthSession()
  if (!isSignedSession(result)) redirect(createAuthLoginPath(returnTo))

  redirect(returnTo)
}
