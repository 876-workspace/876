import type { ReactNode } from 'react'
import { cookies } from 'next/headers'

import { NavProgress } from '@876/ui/nav-progress'
import type { OrgSwitcherOrg } from '@876/ui/org-switcher'
import {
  AppShell,
  AppShellBody,
  AppShellContent,
  AppShellHeader,
  AppShellMain,
  AppShellSidebarArea,
} from '@876/ui/app-shell'
import { SidebarTrigger } from '@876/ui/sidebar'
import type { SidebarUserMenuUser } from '@876/ui/sidebar-user-menu'

import { get876ServerClient } from '@/lib/876/server'
import { getPlatformClient } from '@/lib/876/platform-client'
import { unwrapResult } from '@876/core/client/lookup'
import { Sidebar } from './sidebar'
import { AppsGroup, AppNavLink } from './apps-group'
import { OrgSwitcher } from './org-switcher'
import { UserMenu } from './user-menu'

type ShellOrganization = {
  id: string
  name: string | null
  slug: string
}

export async function Shell({
  children,
  organization,
  enabledFeatureSlugs,
  permissions,
  orgId,
  userId,
  user,
}: {
  children: ReactNode
  organization: ShellOrganization
  enabledFeatureSlugs?: string[]
  permissions?: string[]
  orgId: string
  userId: string
  user: SidebarUserMenuUser
}) {
  const cookieStore = await cookies()
  const sidebarCookie = cookieStore.get('sidebar_state')
  const defaultSidebarOpen = sidebarCookie
    ? sidebarCookie.value === 'true'
    : true

  const [appsSlot, switcherOrgs] = await Promise.all([
    buildAppsSlot(orgId, organization.slug),
    buildSwitcherOrgs(userId),
  ])
  const currentOrg: OrgSwitcherOrg = {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
  }
  const topbarOrgs = switcherOrgs.length > 0 ? switcherOrgs : [currentOrg]

  return (
    <AppShell defaultOpen={defaultSidebarOpen}>
      <NavProgress />
      <AppShellSidebarArea>
        <Sidebar
          organization={organization}
          enabledFeatureSlugs={enabledFeatureSlugs}
          permissions={permissions}
          appsSlot={appsSlot}
        />
      </AppShellSidebarArea>

      <AppShellContent>
        <AppShellHeader>
          <SidebarTrigger />

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden items-center gap-1.5 md:flex">
              <OrgSwitcher current={currentOrg} orgs={topbarOrgs} />
            </div>
            <UserMenu user={user} />
          </div>
        </AppShellHeader>

        <AppShellBody>
          <AppShellMain>{children}</AppShellMain>
        </AppShellBody>
      </AppShellContent>
    </AppShell>
  )
}

async function buildAppsSlot(
  orgId: string,
  orgSlug: string
): Promise<ReactNode> {
  const client = await get876ServerClient()
  const result = await client.entitlements.list(orgId)
  // Navigation degrades to an empty group on failure — never crash the shell.
  const subscriptions = (result.data?.data ?? []).filter(
    (subscription) =>
      subscription.status === 'active' &&
      subscription.app_slug &&
      subscription.app_name &&
      subscription.app_kind !== 'internal'
  )

  return (
    <AppsGroup orgSlug={orgSlug}>
      {subscriptions.map((subscription) => (
        <AppNavLink
          key={subscription.id}
          href={`/${orgSlug}/apps/${subscription.app_slug}`}
          title={subscription.app_name ?? subscription.app_slug ?? 'App'}
          logoUrl={subscription.app_logo_url}
        />
      ))}
    </AppsGroup>
  )
}

/**
 * Resolves the signed-in user's active org memberships for the topbar org
 * switcher. On any platform failure the switcher degrades to a single-org view
 * (hidden in the topbar), so the shell never crashes.
 */
async function buildSwitcherOrgs(userId: string): Promise<OrgSwitcherOrg[]> {
  const client = await getPlatformClient()
  const result = await client.memberships.listRouting({
    userId,
    status: 'active',
  })
  if (result.error) return []

  return unwrapResult(result, 'routing memberships')
    .data.filter((membership) => membership.organization.status === 'active')
    .map((membership) => ({
      id: membership.organization.id,
      name: membership.organization.name,
      slug: membership.organization.slug,
      role: membership.role,
    }))
}
