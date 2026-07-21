import type { ReactNode } from 'react'
import { cookies } from 'next/headers'

import { SidebarTrigger } from '@876/ui/sidebar'
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

import { WorkspaceSidebar } from './billing-sidebar'
import { BillingOrgSwitcher } from './billing-org-switcher'
import { TopbarActions } from './billing-topbar-actions'
import { TopbarSearch } from './billing-topbar-search'
import { BillingUserMenu } from './billing-user-menu'
import type { Permission } from '@/types/access'
import type { BillingFeatures } from '@/types/features'

export async function Shell({
  children,
  tenantName,
  user,
  permissions,
  features,
  currentOrg,
  orgs,
}: {
  children: ReactNode
  tenantName: string
  user: SidebarUserMenuUser
  permissions: Permission[]
  features: BillingFeatures
  currentOrg: OrgSwitcherOrg
  orgs: OrgSwitcherOrg[]
}) {
  const cookieStore = await cookies()
  const sidebarCookie = cookieStore.get('sidebar_state')
  const defaultSidebarOpen = sidebarCookie
    ? sidebarCookie.value === 'true'
    : true

  return (
    <AppShell defaultOpen={defaultSidebarOpen}>
      <AppShellSidebarArea>
        <WorkspaceSidebar
          tenantName={tenantName}
          permissions={permissions}
          productFeatures={features.productFeatures}
        />
      </AppShellSidebarArea>
      <AppShellContent>
        <AppShellHeader>
          <SidebarTrigger />

          <div className="hidden min-w-0 flex-1 items-center md:flex">
            {features.uiFeatures.searchBar && (
              <TopbarSearch
                permissions={permissions}
                productFeatures={features.productFeatures}
              />
            )}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden items-center gap-1.5 md:flex">
              {features.uiFeatures.orgSwitcher && (
                <BillingOrgSwitcher current={currentOrg} orgs={orgs} />
              )}

              <TopbarActions
                showGlobalAdd={features.uiFeatures.globalAdd}
                showAppSwitcher={features.uiFeatures.appSwitcher}
              />
            </div>

            <BillingUserMenu
              user={user}
              showThemeSwitcher={features.uiFeatures.themeSwitcher}
            />
          </div>
        </AppShellHeader>

        {/* Navbar spans full content width; dock sits under it beside main. */}
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
  )
}
