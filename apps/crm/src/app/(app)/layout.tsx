import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'

import { resolveNavigation } from '@876/core/access'
import { AppError } from '@876/ui/app-error'

import { Shell } from '@/components/shell/shell'
import { getAppsDirectory } from '@/lib/apps-directory'
import { resolveAccessContext } from '@/lib/auth/access-context'
import { getCrmContextResult } from '@/lib/auth/context'
import { navConfig } from '@/components/shell/nav-config'
import { getFeatures } from '@/lib/features'
import { getAuthSession, isSignedSession } from '@/lib/auth/session'
import { crm } from '@/lib/services/crm'

export default async function AppLayout({ children }: { children: ReactNode }) {
  const result = await getCrmContextResult()

  if (result.status === 'signed-out') redirect('/login')
  if (result.status === 'unavailable') redirect('/unavailable')
  if (result.status === 'no-organization') redirect('/onboarding')

  const { accessStatus, orgName, role, organizations, orgId, orgSlug, userId } =
    result.context
  if (accessStatus === 'blocked') redirect('/no-access')
  if (accessStatus !== 'active' && accessStatus !== 'trialing') {
    if (role === 'super-admin' || role === 'admin') redirect('/onboarding')
    redirect('/no-access')
  }

  const access = await resolveAccessContext(userId, orgId)
  if (access.status === 'ok' && access.context.permissions.length === 0)
    redirect('/no-access')

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
    orgs[0] ?? { id: orgId, name: orgName, slug: orgSlug ?? orgId }

  const categoriesResult = await crm.requestCategories.list(orgId)
  if (categoriesResult.error)
    console.error(
      `[crm/shell] request categories unavailable: ${categoriesResult.error.code} — ${categoriesResult.error.message}`
    )
  const supportCategories = (categoriesResult.data?.data ?? [])
    .filter((category) => category.isActive)
    .map((category) => ({ id: category.id, name: category.name }))

  const { uiFeatures } = await getFeatures({ userId, organizationId: orgId })

  return (
    <Shell
      orgName={orgName}
      user={{ name: displayName, email, avatar: user?.avatar ?? null }}
      currentOrg={currentOrg}
      orgs={orgs}
      apps={getAppsDirectory()}
      uiFeatures={uiFeatures}
      supportCategories={supportCategories}
      navigation={
        access.status === 'ok' ? resolveNavigation(navConfig, access.context) : []
      }
    >
      {access.status === 'unavailable' ? (
        <AppError
          title="Access could not be verified"
          error={{
            code: access.code,
            message: 'App access is temporarily unavailable. Try again shortly.',
          }}
          variant="banner"
        />
      ) : (
        children
      )}
    </Shell>
  )
}
