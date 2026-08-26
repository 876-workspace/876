import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'

import { Shell } from '@/components/shell/shell'
import { getCrmContextResult } from '@/lib/auth/context'
import { getAuthSession, isSignedSession } from '@/lib/auth/session'

export default async function AppLayout({ children }: { children: ReactNode }) {
  const result = await getCrmContextResult()

  if (result.status === 'signed-out') redirect('/login')
  if (result.status === 'unavailable') redirect('/unavailable')
  if (result.status === 'no-organization') redirect('/onboarding')

  const { accessStatus, orgName, role, organizations, orgId, orgSlug } =
    result.context
  if (accessStatus === 'blocked') redirect('/no-access')
  if (accessStatus !== 'active' && accessStatus !== 'trialing') {
    if (role === 'owner' || role === 'admin') redirect('/onboarding')
    redirect('/no-access')
  }

  const session = await getAuthSession()
  const user = isSignedSession(session) ? session.user : null
  const email = user?.email ?? ''
  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
    email ||
    'User'

  const orgs = organizations.map((org) => ({
    id: org.id,
    name: org.name,
    slug: org.slug ?? org.id,
    role: org.role,
  }))
  const currentOrg = orgs.find((org) => org.id === orgId) ??
    orgs[0] ?? {
      id: orgId,
      name: orgName,
      slug: orgSlug ?? orgId,
    }

  return (
    <Shell
      orgName={orgName}
      user={{
        name: displayName,
        email,
        avatar: user?.avatar ?? null,
      }}
      currentOrg={currentOrg}
      orgs={orgs}
    >
      {children}
    </Shell>
  )
}
