import { redirect } from 'next/navigation'
import type { NextRequest } from 'next/server'

import {
  AUTH_RETURN_TO_PARAM,
  resolveRelativeReturnTo,
} from '@876/core/auth/return-to'

import { getPlatformClient } from '@/lib/876/platform-client'
import { getManageContext } from '@/lib/auth/manage-context'
import { getAuthSession, isSignedSession } from '@/lib/auth/session'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const returnTo = resolveRelativeReturnTo(
    searchParams.get(AUTH_RETURN_TO_PARAM),
    '/'
  )
  const session = await getAuthSession()
  if (!isSignedSession(session))
    redirect(`/login?${AUTH_RETURN_TO_PARAM}=${encodeURIComponent(returnTo)}`)

  const ctx = await getManageContext()
  if (!ctx) {
    const platform = await getPlatformClient()
    const memberships = await platform.auth.getRoutingMemberships({
      userId: session.user.id,
    })
    if (memberships.error) redirect('/no-access')
    if (memberships.data.data.length === 0) redirect('/onboarding')

    redirect('/no-access')
  }

  if (ctx.tenant && ctx.accessStatus === 'active') redirect(returnTo)
  if (ctx.role === 'member') redirect('/no-access')

  redirect('/onboarding')
}
