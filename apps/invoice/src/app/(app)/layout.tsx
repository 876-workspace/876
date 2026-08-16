import { redirect } from 'next/navigation'

import { InvoiceShell } from '@/components/shell/shell'
import { getInvoiceContextResult } from '@/lib/auth/context'
import { requireValidSession } from '@/lib/auth/guards'
import { getAuthSession, isSignedSession } from '@/lib/auth/session'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireValidSession('/')

  const result = await getInvoiceContextResult()

  if (result.status === 'no-organization') redirect('/onboarding')
  if (result.status !== 'ok') redirect('/onboarding')

  const context = result.context
  // An organization without an active Invoice entitlement is not necessarily
  // stuck: an owner or admin can turn it on, and every organization created
  // before 876 Invoice existed reaches this branch. Send them to /onboarding,
  // which owns that decision and redirects the genuinely-blocked on to
  // /no-access. Answering /no-access here made the recovery path unreachable
  // from the app's own entry point.
  if (context.accessStatus !== 'active' && context.accessStatus !== 'trialing')
    redirect('/onboarding')

  const session = await getAuthSession()
  const user = isSignedSession(session) ? session.user : null
  const email = user?.email ?? ''
  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
    email ||
    'User'

  const orgs = context.organizations.map((org) => ({
    id: org.id,
    name: org.name,
    slug: org.slug ?? org.id,
  }))
  const currentOrg = orgs.find((org) => org.id === context.orgId) ??
    orgs[0] ?? {
      id: context.orgId,
      name: context.orgName,
      slug: context.orgSlug ?? context.orgId,
    }

  return (
    <InvoiceShell
      orgName={context.orgName}
      user={{
        name: displayName,
        email,
        avatar: user?.avatar ?? null,
      }}
      currentOrg={currentOrg}
      orgs={orgs}
    >
      {children}
    </InvoiceShell>
  )
}
