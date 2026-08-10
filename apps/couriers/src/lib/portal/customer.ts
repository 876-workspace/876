import 'server-only'

import { cache } from 'react'
import { redirect } from 'next/navigation'

import { AUTH_RETURN_TO_PARAM } from '@876/core/auth/return-to'

import { getAuthSession, isSignedSession } from '@/lib/auth/session'

import {
  createPortalCouriersClient,
  isPortalNotFound,
  requirePortalData,
} from './client'
import { getPortalTenant } from './tenant'

/**
 * Resolves the signed-in portal customer, redirecting if any part is missing.
 *
 * Wrapped in React `cache()` so the segment layout — which runs this as a
 * blocking guard before the route streams — and the page body beneath it share
 * one profile lookup per request rather than querying twice.
 */
export const requirePortalCustomer = cache(async function requirePortalCustomer(
  returnTo: string
) {
  const session = await getAuthSession()
  if (!isSignedSession(session))
    redirect(withReturnTo('/portal/login', returnTo))

  const tenant = await getPortalTenant()
  if (!tenant) redirect('/portal/unavailable')

  const profileResult = await createPortalCouriersClient(
    session.accessToken
  ).portal.customer.retrieve(tenant.id)
  if (isPortalNotFound(profileResult))
    redirect(withReturnTo('/portal/auth/complete', returnTo))

  const profile = requirePortalData(profileResult)

  return { session, tenant, profile }
})

function withReturnTo(path: string, returnTo: string): string {
  if (returnTo === '/portal') return path

  const searchParams = new URLSearchParams({
    [AUTH_RETURN_TO_PARAM]: returnTo,
  })
  return `${path}?${searchParams.toString()}`
}
