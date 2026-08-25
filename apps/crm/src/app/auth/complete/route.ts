import {
  AUTH_RETURN_TO_PARAM,
  resolveRelativeReturnTo,
} from '@876/core/auth/return-to'
import { redirect } from 'next/navigation'
import type { NextRequest } from 'next/server'

import { getCrmContextResult } from '@/lib/auth/context'
import { getAuthSession, isSignedSession } from '@/lib/auth/session'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const returnTo = resolveRelativeReturnTo(
    request.nextUrl.searchParams.get(AUTH_RETURN_TO_PARAM),
    '/'
  )

  const session = await getAuthSession()
  if (!isSignedSession(session))
    redirect(`/login?${AUTH_RETURN_TO_PARAM}=${encodeURIComponent(returnTo)}`)

  const result = await getCrmContextResult()
  if (result.status === 'signed-out')
    redirect(`/login?${AUTH_RETURN_TO_PARAM}=${encodeURIComponent(returnTo)}`)
  if (result.status === 'unavailable') redirect('/unavailable')
  if (result.status === 'no-organization') redirect('/onboarding')

  if (result.context.accessStatus === 'active' || result.context.accessStatus === 'trialing')
    redirect(returnTo)

  if (
    result.context.accessStatus !== 'blocked' &&
    (result.context.role === 'owner' || result.context.role === 'admin')
  )
    redirect('/onboarding')

  redirect('/no-access')
}
