import {
  AUTH_RETURN_TO_PARAM,
  resolveRelativeReturnTo,
} from '@876/core/auth/return-to'
import { redirect } from 'next/navigation'
import type { NextRequest } from 'next/server'

import { getAuthSession, isSignedSession } from '@/lib/auth/session'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const returnTo = resolveRelativeReturnTo(
    request.nextUrl.searchParams.get(AUTH_RETURN_TO_PARAM),
    '/'
  )
  const session = await getAuthSession()
  if (!isSignedSession(session)) {
    redirect(`/login?${AUTH_RETURN_TO_PARAM}=${encodeURIComponent(returnTo)}`)
  }

  redirect(returnTo)
}
