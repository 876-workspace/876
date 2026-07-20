import type { ReactNode } from 'react'
import { cookies } from 'next/headers'

import { AppSwitcher, type AppSwitcherApp } from '@876/ui/app-switcher'
import {
  AppShell,
  AppShellBody,
  AppShellContent,
  AppShellHeader,
  AppShellMain,
  AppShellSidebarArea,
} from '@876/ui/app-shell'
import { Button } from '@876/ui/button'
import { PlusIcon } from '@876/ui/icons'
import type { OrgSwitcherOrg } from '@876/ui/org-switcher'
import { SidebarTrigger } from '@876/ui/sidebar'
import type { SidebarUserMenuUser } from '@876/ui/sidebar-user-menu'
import { SharedWidgetDock } from '@876/widgets/react'

import { CouriersSidebar } from './couriers-sidebar'
import {
  CouriersOrgSwitcher,
  CouriersTopbarSearch,
  CouriersUserMenu,
} from './couriers-topbar'
import type { CouriersFeatures } from '@/types/features'

export async function CouriersShell({
  children,
  basePath,
  tenantName,
  user,
  uiFeatures,
  currentOrg,
  orgs,
  apps,
  enabledWidgetIds,
}: {
  children: ReactNode
  basePath: string
  tenantName: string
  user: SidebarUserMenuUser
  uiFeatures: CouriersFeatures['uiFeatures']
  currentOrg: OrgSwitcherOrg
  orgs: OrgSwitcherOrg[]
  apps: AppSwitcherApp[]
  enabledWidgetIds: string[]
}) {
  const cookieStore = await cookies()
  const sidebarCookie = cookieStore.get('sidebar_state')
  const defaultSidebarOpen = sidebarCookie
    ? sidebarCookie.value === 'true'
    : true

  return (
    <AppShell defaultOpen={defaultSidebarOpen}>
      <AppShellSidebarArea>
        <CouriersSidebar basePath={basePath} tenantName={tenantName} />
      </AppShellSidebarArea>

      <AppShellContent>
        <AppShellHeader className="dark:bg-876-canvas h-16 backdrop-blur-md dark:shadow-none dark:backdrop-blur-none">
          <SidebarTrigger />

          <div className="hidden min-w-0 flex-1 items-center md:flex">
            {uiFeatures.searchBar && (
              <CouriersTopbarSearch basePath={basePath} />
            )}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden items-center gap-1.5 md:flex">
              {uiFeatures.orgSwitcher && (
                <CouriersOrgSwitcher current={currentOrg} orgs={orgs} />
              )}

              {uiFeatures.globalAdd && (
                <>
                  <Button
                    variant="info"
                    size="icon"
                    className="bg-876-blue h-8 w-8 rounded-lg shadow-sm hover:bg-[color-mix(in_oklab,var(--876-blue)_82%,black)]"
                    aria-label="Create new"
                  >
                    <PlusIcon className="size-4" strokeWidth={2.5} />
                  </Button>
                  <div aria-hidden className="bg-border mx-1 h-4 w-px" />
                </>
              )}

              <a
                href="https://docs.876.dev"
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground hover:bg-muted hover:text-foreground hidden h-8 items-center justify-center rounded-lg px-3 text-[0.8125rem] font-medium transition-colors sm:flex"
              >
                Help
              </a>

              {uiFeatures.appSwitcher && <AppSwitcher apps={apps} />}
            </div>

            <CouriersUserMenu
              user={user}
              showThemeSwitcher={uiFeatures.themeSwitcher}
            />
          </div>
        </AppShellHeader>

        <AppShellBody>
          <AppShellMain>{children}</AppShellMain>
          {enabledWidgetIds.length > 0 ? (
            <SharedWidgetDock
              enabledWidgetIds={enabledWidgetIds}
              navbarHeight={64}
              host="couriers"
            />
          ) : null}
        </AppShellBody>
      </AppShellContent>
    </AppShell>
  )
}
