import type { ReactNode } from 'react'
import { cookies } from 'next/headers'

import { SidebarInset, SidebarProvider, SidebarTrigger } from '@876/ui/sidebar'

import { get876ServerClient } from '@/lib/876/server'
import {
  EnterpriseSidebar,
  type EnterpriseSidebarUser,
} from './enterprise-sidebar'
import {
  EnterpriseAppsGroup,
  EnterpriseAppNavLink,
} from './enterprise-apps-group'

export async function EnterpriseShell({
  children,
  organization,
  enabledFeatureSlugs,
  permissions,
  orgId,
  user,
}: {
  children: ReactNode
  organization: { name: string | null; slug: string }
  enabledFeatureSlugs?: string[]
  permissions?: string[]
  orgId: string
  user: EnterpriseSidebarUser
}) {
  const cookieStore = await cookies()
  const sidebarCookie = cookieStore.get('sidebar_state')
  const defaultSidebarOpen = sidebarCookie
    ? sidebarCookie.value === 'true'
    : true

  const appsSlot = await buildAppsSlot(orgId, organization.slug)

  return (
    <SidebarProvider
      defaultOpen={defaultSidebarOpen}
      className="h-svh overflow-hidden"
    >
      <EnterpriseSidebar
        organization={organization}
        enabledFeatureSlugs={enabledFeatureSlugs}
        permissions={permissions}
        appsSlot={appsSlot}
        user={user}
      />

      <SidebarInset className="bg-876-canvas flex h-svh min-h-0 flex-col overflow-hidden">
        <header className="876-topbar border-876-surface-border dark:bg-876-canvas z-20 flex h-16 shrink-0 items-center gap-3 border-b-0 pr-4 pl-3 backdrop-blur-md sm:pr-6 lg:pr-8 dark:shadow-none dark:backdrop-blur-none">
          <SidebarTrigger />
          <span className="text-sm font-medium text-[#202124] dark:text-white">
            {organization.name ?? organization.slug}
          </span>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}

async function buildAppsSlot(
  orgId: string,
  orgSlug: string
): Promise<ReactNode> {
  const client = await get876ServerClient()
  const result = await client.subscriptions.list(orgId)
  // Navigation degrades to an empty group on failure — never crash the shell.
  const subscriptions = (result.data?.data ?? []).filter(
    (subscription) =>
      subscription.status === 'active' &&
      subscription.app_slug &&
      subscription.app_name &&
      subscription.app_kind !== 'internal'
  )

  return (
    <EnterpriseAppsGroup orgSlug={orgSlug}>
      {subscriptions.map((subscription) => (
        <EnterpriseAppNavLink
          key={subscription.id}
          href={`/${orgSlug}/apps/${subscription.app_slug}`}
          title={subscription.app_name ?? subscription.app_slug ?? 'App'}
          logoUrl={subscription.app_logo_url}
        />
      ))}
    </EnterpriseAppsGroup>
  )
}
