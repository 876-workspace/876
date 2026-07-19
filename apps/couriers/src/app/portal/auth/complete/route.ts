import { redirect } from 'next/navigation'
import type { NextRequest } from 'next/server'

import {
  AUTH_RETURN_TO_PARAM,
  resolveRelativeReturnTo,
} from '@876/core/auth/return-to'

import { getAuthSession, isSignedSession } from '@/lib/auth/session'
import { ensurePortalCustomer } from '@/lib/portal/enroll'
import { getPortalTenant } from '@/lib/portal/tenant'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const session = await getAuthSession()
  if (!isSignedSession(session)) redirect('/portal/login')

  const tenant = await getPortalTenant()
  if (!tenant) redirect('/portal/unavailable')

  const enrollment = await ensurePortalCustomer({
    tenant,
    userId: session.user.id,
    email: session.user.email,
    firstName: session.user.firstName,
    lastName: session.user.lastName,
  })
  if (enrollment.error) redirect('/portal/login?error=enrollment')

  const requestedReturnTo = resolveRelativeReturnTo(
    request.nextUrl.searchParams.get(AUTH_RETURN_TO_PARAM),
    '/portal'
  )
  const returnTo = isPortalReturnTo(requestedReturnTo)
    ? requestedReturnTo
    : '/portal'

  redirect(returnTo)
}

function isPortalReturnTo(path: string): boolean {
  if (path !== '/portal' && !path.startsWith('/portal/')) return false

  return !path.includes('..')
}
