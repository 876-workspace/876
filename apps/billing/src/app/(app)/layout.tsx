import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

import { createAuthLoginPath } from '@876/core/auth/return-to'

import { Shell } from '@/components/shell/shell'
import { getContext } from '@/lib/auth/billing-context'
import { requireValidSession } from '@/lib/auth/guards'
import { getAuthSession, isSignedSession } from '@/lib/auth/session'
import { getFeatures } from '@/lib/features'

export default async function AppLayout({ children }: { children: ReactNode }) {
  // Confirms the account behind the sealed cookie still exists and is active,
  // and redirects to login when it does not. Without it, a deleted or disabled
  // account passed the signature check, resolved no memberships, and fell
  // through to /get-started below — asked to create an organization it could
  // never create, with no route back to login.
  await requireValidSession('/')

  const context = await getContext()
  if (!context) {
    const session = await getAuthSession()
    if (!isSignedSession(session)) redirect(createAuthLoginPath('/'))
    // Signed in with no organization yet (brand-new signup, incl. social): send
    // them to create their org rather than stranding them on /no-access.
    redirect('/get-started')
  }
  if (!context.tenant) {
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
