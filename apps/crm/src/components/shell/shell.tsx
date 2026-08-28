import type { ReactNode } from 'react'
import { cookies } from 'next/headers'

import { AppSwitcher, type AppSwitcherApp } from '@876/ui/app-switcher'
import { NavProgress } from '@876/ui/nav-progress'
import type { OrgSwitcherOrg } from '@876/ui/org-switcher'
import { SidebarTrigger } from '@876/ui/sidebar'
import type { SidebarUserMenuUser } from '@876/ui/sidebar-user-menu'
import {
  AppShell,
  AppShellBody,
  AppShellContent,
  AppShellHeader,
  AppShellMain,
  AppShellSidebarArea,
} from '@876/ui/app-shell'

import type { CrmUiFeatures } from '@/types/features'

import { Sidebar } from './sidebar'
import { GlobalAdd } from './global-add'
import { OrgSwitcher } from './org-switcher'
import { SupportWidget } from './support-widget'
import type { SupportCategory } from './support-categories'
import { TopbarSearch } from './topbar-search'
import { UserMenu } from './user-menu'

export async function Shell({
  children,
  orgName,
  user,
  currentOrg,
  orgs,
  apps,
  uiFeatures,
  supportCategories,
}: {
  children: ReactNode
  orgName: string
  user: SidebarUserMenuUser
  currentOrg: OrgSwitcherOrg
  orgs: OrgSwitcherOrg[]
  apps: AppSwitcherApp[]
  uiFeatures: CrmUiFeatures
  supportCategories: SupportCategory[]
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
        <Sidebar orgName={orgName} />
      </AppShellSidebarArea>
      <AppShellContent>
        <AppShellHeader>
          <SidebarTrigger />

          <div className="flex min-w-0 flex-1 items-center">
            {uiFeatures.searchBar && <TopbarSearch />}
          </div>

          {/*
            Three groups, not one undifferentiated row: the organization you
            are acting for, the actions you can take, and who you are. The icon
            actions share a tighter gap than the gap between groups, so they
            read as one cluster, and a hairline marks each seam — which is what
            stops a control from looking like it belongs to its neighbour as
            more of them are added.

            Sizes match the shared AppSwitcher trigger (32px); the breathing
            room comes from the gaps, not from resizing one app's buttons.
          */}
          <div className="ml-auto flex items-center gap-3 sm:gap-4">
            {uiFeatures.orgSwitcher ? (
              <>
                <OrgSwitcher current={currentOrg} orgs={orgs} />
                <span
                  aria-hidden="true"
                  className="bg-border/70 hidden h-5 w-px sm:block"
                />
              </>
            ) : null}

            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Sits where a help button would: raising a bug or a piece of
                  feedback should not require leaving the page you are on. */}
              <SupportWidget categories={supportCategories} />
              {uiFeatures.globalAdd && <GlobalAdd />}
              {uiFeatures.appSwitcher && <AppSwitcher apps={apps} />}
            </div>

            <span
              aria-hidden="true"
              className="bg-border/70 hidden h-5 w-px sm:block"
            />

            <UserMenu
              user={user}
              showThemeSwitcher={uiFeatures.themeSwitcher}
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
