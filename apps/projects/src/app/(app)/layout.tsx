import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'

import { resolveNavigation } from '@876/core/access'
import { buildAppsDirectory } from '@876/core/apps-directory'
import { AppError } from '@876/ui/app-error'

import { Shell } from '@/components/shell/shell'
import {
  callerRoleKeys,
  orgScopeModules,
  resolveCustomModuleNavEntries,
  visibleModules,
} from '@/lib/custom-modules/module-access'
import { resolveAccessContext } from '@/lib/auth/access-context'
import { getProjectsContextResult } from '@/lib/auth/context'
import { navConfig } from '@/components/shell/nav-config'
import { getFeatures } from '@/lib/features'
import { getAuthSession, isSignedSession } from '@/lib/auth/session'

export default async function AppLayout({ children }: { children: ReactNode }) {
  const result = await getProjectsContextResult()

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

  const { uiFeatures } = await getFeatures()

  let customModuleNav: ReturnType<typeof resolveCustomModuleNavEntries>[] = []
  if (access.status === 'ok') {
    try {
      const roleKeys = callerRoleKeys(access.context.permissions)
      const { serviceWithRoleKeys: withRoles } = await import(
        '@/lib/custom-modules/service-with-roles'
      )
      const listed = await withRoles(roleKeys).customModules.listModules(orgId)
      if (listed.data) {
        const visible = visibleModules(orgScopeModules(listed.data.data), roleKeys)
        if (visible.length > 0) customModuleNav = [resolveCustomModuleNavEntries(visible)]
      }
    } catch {
      customModuleNav = []
    }
  }

  let notificationCount = 0
  try {
    const { projects } = await import('@/lib/clients/projects')
    const notifications = await projects.notifications.list(orgId, userId)
    if (notifications.data)
      notificationCount = notifications.data.data.filter(
        (notification) => notification.readAt === null
      ).length
  } catch {
    notificationCount = 0
  }

  return (
    <Shell
      user={{ name: displayName, email, avatar: user?.avatar ?? null }}
      currentOrg={currentOrg}
      orgs={orgs}
      apps={buildAppsDirectory({ current: 'projects' })}
      uiFeatures={uiFeatures}
      navigation={
        access.status === 'ok'
          ? [...resolveNavigation(navConfig, access.context), ...customModuleNav]
          : []
      }
      notificationCount={notificationCount}
    >
      {access.status === 'unavailable' ? (
        <AppError
          title="Access could not be verified"
          error={{
            code: access.code,
            message:
              'App access is temporarily unavailable. Try again shortly.',
          }}
          variant="banner"
        />
      ) : (
        children
      )}
    </Shell>
  )
}
