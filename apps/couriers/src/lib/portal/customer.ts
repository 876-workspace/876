import 'server-only'

import { redirect } from 'next/navigation'

import { AUTH_RETURN_TO_PARAM } from '@876/core/auth/return-to'

import { getAuthSession, isSignedSession } from '@/lib/auth/session'
import { service } from '@/lib/service'

import { getPortalTenant } from './tenant'

export async function requirePortalCustomer(returnTo: string) {
  const session = await getAuthSession()
  if (!isSignedSession(session))
    redirect(withReturnTo('/portal/login', returnTo))

  const tenant = await getPortalTenant()
  if (!tenant) redirect('/portal/unavailable')

  const profile = await service.customerProfiles.retrieveByTenantAndUser(
    tenant.id,
    session.user.id
  )
  if (!profile) redirect(withReturnTo('/portal/auth/complete', returnTo))

  return { session, tenant, profile }
}

function withReturnTo(path: string, returnTo: string): string {
  if (returnTo === '/portal') return path

  const searchParams = new URLSearchParams({
    [AUTH_RETURN_TO_PARAM]: returnTo,
  })
  return `${path}?${searchParams.toString()}`
}
