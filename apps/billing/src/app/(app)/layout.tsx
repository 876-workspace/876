import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

import { AUTH_RETURN_TO_PARAM } from '@876/core/auth/return-to'

import { Shell } from '@/components/billing-shell'
import { getContext } from '@/lib/auth/billing-context'
import { getAuthSession, isSignedSession } from '@/lib/auth/session'
import { getFeatures } from '@/lib/features'

export default async function AppLayout({ children }: { children: ReactNode }) {
  const context = await getContext()
  if (!context) {
    const session = await getAuthSession()
    if (!isSignedSession(session)) redirect(`/login?${AUTH_RETURN_TO_PARAM}=/`)
    redirect('/no-access')
  }
  if (context.accessStatus !== 'active' || !context.tenant) {
    redirect(context.role === 'member' ? '/no-access' : '/get-started')
  }
  if (
    !context.access ||
    context.access.status !== 'ACTIVE' ||
    !context.permissions.includes('billing:access')
  )
    redirect('/no-access')

  const session = await getAuthSession()
  const sessionUser = isSignedSession(session) ? session.user : null
  const name = sessionUser
    ? [sessionUser.firstName, sessionUser.lastName].filter(Boolean).join(' ') ||
      sessionUser.email
    : context.tenant.name

  const features = await getFeatures({
    userId: sessionUser?.id,
    organizationId: context.orgId,
  })
  const currentOrg = context.organizations.find(
    (organization) => organization.id === context.orgId
  )
  if (!currentOrg) redirect('/no-access')

  return (
    <Shell
      tenantName={context.tenant.name}
      user={{
        name,
        email: sessionUser?.email ?? '',
        avatar: sessionUser?.avatar ?? null,
      }}
      features={features}
      permissions={context.permissions}
      currentOrg={currentOrg}
      orgs={context.organizations}
    >
      {children}
    </Shell>
  )
}
