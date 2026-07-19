import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import {
  AUTH_RETURN_TO_PARAM,
  resolveRelativeReturnTo,
} from '@876/core/auth/return-to'

import { PortalEmbeddedAuth } from '@/components/portal/embedded-auth'
import { getAuthSession, isSignedSession } from '@/lib/auth/session'
import { getPortalTenant } from '@/lib/portal/tenant'

export const metadata: Metadata = {
  title: 'Sign in',
}

export default async function PortalLoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const requestedReturnTo = resolveRelativeReturnTo(
    firstParam(params[AUTH_RETURN_TO_PARAM]),
    '/portal'
  )
  const returnTo = requestedReturnTo.startsWith('/portal')
    ? requestedReturnTo
    : '/portal'
  const enrollmentError = firstParam(params.error) === 'enrollment'

  const [tenant, session] = await Promise.all([
    getPortalTenant(),
    getAuthSession(),
  ])
  if (!tenant) redirect('/portal/unavailable')
  if (isSignedSession(session) && !enrollmentError)
    redirect(getCompleteHref(returnTo))

  return (
    <PortalEmbeddedAuth
      tenantName={tenant.name}
      returnTo={returnTo}
      enrollmentError={enrollmentError}
    />
  )
}

function getCompleteHref(returnTo: string): string {
  if (returnTo === '/portal') return '/portal/auth/complete'

  const searchParams = new URLSearchParams({
    [AUTH_RETURN_TO_PARAM]: returnTo,
  })
  return `/portal/auth/complete?${searchParams.toString()}`
}

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}
