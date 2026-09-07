import type { ReactNode } from 'react'
import { cookies } from 'next/headers'

import { NavProgress } from '@876/ui/nav-progress'
import type { OrgSwitcherOrg } from '@876/ui/org-switcher'
import type { SidebarUserMenuUser } from '@876/ui/sidebar-user-menu'
import type { NavGroupDefinition } from '@876/core/access'
import { SidebarTrigger } from '@876/ui/sidebar'
import {
  AppShell,
  AppShellBody,
  AppShellContent,
  AppShellHeader,
  AppShellMain,
  AppShellSidebarArea,
} from '@876/ui/app-shell'

import type { InvoiceFeatures } from '@/types/features'
import { InvoiceSidebar } from './sidebar'
import { OrgSwitcher } from './org-switcher'
import { SupportWidget } from './support-widget'
import { TopbarActions } from './topbar-actions'
import { TopbarSearch } from './topbar-search'
import { UserMenu } from './user-menu'

export async function InvoiceShell({
  children,
  orgName,
  user,
  currentOrg,
  orgs,
  features,
  navigation,
}: {
  children: ReactNode
  orgName: string
  user: SidebarUserMenuUser
  currentOrg: OrgSwitcherOrg
  orgs: OrgSwitcherOrg[]
  features: InvoiceFeatures
  navigation: NavGroupDefinition[]
}) {
  const cookieStore = await cookies()
  const sidebarCookie = cookieStore.get('sidebar_state')
  const defaultSidebarOpen = sidebarCookie
    ? sidebarCookie.value === 'true'
    : true

  return (
    <AppShell defaultOpen={defaultSidebarOpen}>
      <NavProgress />
      <AppShellSidebarArea>
        <InvoiceSidebar orgName={orgName} navigation={navigation} />
      </AppShellSidebarArea>
      <AppShellContent>
        <AppShellHeader>
          <SidebarTrigger />

          <div className="hidden min-w-0 flex-1 items-center md:flex">
            {features.uiFeatures.searchBar ? (
              <TopbarSearch
                navigation={navigation.flatMap((group) =>
                  group.entries.map(({ title, href }) => ({ title, href }))
                )}
              />
            ) : null}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <SupportWidget />
            <div className="hidden items-center gap-1.5 md:flex">
              {features.uiFeatures.orgSwitcher ? (
                <OrgSwitcher current={currentOrg} orgs={orgs} />
              ) : null}
              <TopbarActions
                showGlobalAdd={features.uiFeatures.globalAdd}
                showAppSwitcher={features.uiFeatures.appSwitcher}
              />
            </div>
            <UserMenu
              user={user}
              showThemeSwitcher={features.uiFeatures.themeSwitcher}
            />
          </div>
        </AppShellHeader>

        <AppShellBody>
          <AppShellMain>{children}</AppShellMain>
        </AppShellBody>
      </AppShellContent>
    </AppShell>
  )
}
