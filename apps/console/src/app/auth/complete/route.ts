import { redirect } from 'next/navigation'
import type { NextRequest } from 'next/server'

import {
  AUTH_RETURN_TO_PARAM,
  resolveRelativeReturnTo,
} from '@876/core/auth/return-to'

import { getAuthSession, isSignedSession } from '@/lib/auth/session'

export const runtime = 'nodejs'

/**
 * GET /auth/complete — post-authentication landing for Console.
 *
 * The embedded auth flow sets the session cookie via the `/api/auth` bridge,
 * then hard-navigates here. We read the freshly set cookie server-side and
 * redirect to the intended destination (resolved to a same-app relative path,
 * open-redirect safe). Console access is enforced downstream by the RSC
 * layouts/guards, so a session without admin permissions still lands on the
 * access-denied screen rather than the console. If the cookie is missing, fall
 * back to `/login`.
 */
export async function GET(request: NextRequest) {
  const returnTo = resolveRelativeReturnTo(
    request.nextUrl.searchParams.get(AUTH_RETURN_TO_PARAM),
    '/'
  )

  const result = await getAuthSession()
  if (!isSignedSession(result)) redirect(getLoginRedirect(returnTo))

  redirect(returnTo)
}

function getLoginRedirect(returnTo: string): string {
  const searchParams = new URLSearchParams({ [AUTH_RETURN_TO_PARAM]: returnTo })
  return `/login?${searchParams.toString()}`
}
