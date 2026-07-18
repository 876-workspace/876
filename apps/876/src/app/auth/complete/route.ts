import { redirect } from 'next/navigation'
import type { NextRequest } from 'next/server'

import {
  AUTH_RETURN_TO_PARAM,
  resolveRelativeReturnTo,
} from '@876/core/auth/return-to'

import { getAuthSession, isSignedSession } from '@/lib/auth/session'

export const runtime = 'nodejs'

/**
 * GET /auth/complete — post-authentication landing.
 *
 * The embedded auth flow sets the session cookie via the `/api/auth` bridge,
 * then hard-navigates here. We read the freshly set cookie server-side and
 * issue the final redirect to the user's intended destination. `returnTo` is
 * resolved to a same-app relative path (open-redirect safe), defaulting to the
 * consumer dashboard. If the cookie is missing (e.g. it failed to set), fall
 * back to `/login` so the user can retry.
 */
export async function GET(request: NextRequest) {
  const returnTo = resolveRelativeReturnTo(
    request.nextUrl.searchParams.get(AUTH_RETURN_TO_PARAM),
    '/app'
  )

  const result = await getAuthSession()
  if (!isSignedSession(result)) redirect(getLoginRedirect(returnTo))

  redirect(returnTo)
}

function getLoginRedirect(returnTo: string): string {
  const searchParams = new URLSearchParams({ [AUTH_RETURN_TO_PARAM]: returnTo })
  return `/login?${searchParams.toString()}`
}
