import type { ReactNode } from 'react'
import { cookies } from 'next/headers'

import { SidebarTrigger } from '@876/ui/sidebar'
import { NavProgress } from '@876/ui/nav-progress'
import type { OrgSwitcherOrg } from '@876/ui/org-switcher'
import type { SidebarUserMenuUser } from '@876/ui/sidebar-user-menu'
import {
  AppShell,
  AppShellSidebarArea,
  AppShellContent,
  AppShellHeader,
  AppShellBody,
  AppShellMain,
} from '@876/ui/app-shell'
import { SharedWidgetDock } from '@876/widgets/react'
import type { NavGroupDefinition } from '@876/core/access'

import { MobileNav } from './mobile-nav'
import { WorkspaceSidebar } from './sidebar'
import { OrgSwitcher } from './org-switcher'
import { SupportWidget } from './support-widget'
import { TopbarActions } from './topbar-actions'
import { TopbarSearch } from './topbar-search'
import { UserMenu } from './user-menu'
import { BillingPermissionsProvider } from '@/components/providers/permissions-provider'
import type { Permission } from '@/types/access'
import type { BillingFeatures as Features } from '@/types/features'

export async function Shell({
  children,
  tenantName,
  user,
  permissions,
  features,
  navigation,
  currentOrg,
  orgs,
}: {
  children: ReactNode
  tenantName: string
  user: SidebarUserMenuUser
  permissions: Permission[]
  features: Features
  navigation: NavGroupDefinition[]
  currentOrg: OrgSwitcherOrg
  orgs: OrgSwitcherOrg[]
}) {
  const cookieStore = await cookies()
  const sidebarCookie = cookieStore.get('sidebar_state')
  const defaultSidebarOpen = sidebarCookie
    ? sidebarCookie.value === 'true'
    : true

  return (
    <BillingPermissionsProvider permissions={permissions}>
      <AppShell defaultOpen={defaultSidebarOpen}>
        <NavProgress />
        <AppShellSidebarArea className="hidden md:contents">
          <WorkspaceSidebar tenantName={tenantName} navigation={navigation} />
        </AppShellSidebarArea>
        <AppShellContent>
          <AppShellHeader>
            <div className="md:hidden">
              <MobileNav tenantName={tenantName} navigation={navigation} />
            </div>
            <div className="hidden md:block">
              <SidebarTrigger />
            </div>

            <div className="hidden min-w-0 flex-1 items-center md:flex">
              {features.uiFeatures.searchBar && (
                <TopbarSearch navigation={navigation} />
              )}
            </div>

            <div className="ml-auto flex items-center gap-2">
              <SupportWidget />
              <div className="hidden items-center gap-1.5 md:flex">
                {features.uiFeatures.orgSwitcher && (
                  <OrgSwitcher current={currentOrg} orgs={orgs} />
                )}

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
            {features.widgets.notepad || features.uiFeatures.chat ? (
              <SharedWidgetDock
                enabledWidgetIds={features.widgets.notepad ? ['notepad'] : []}
                chatEnabled={features.uiFeatures.chat}
              />
            ) : null}
          </AppShellBody>
        </AppShellContent>
      </AppShell>
    </BillingPermissionsProvider>
  )
}
