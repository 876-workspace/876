import type { ReactNode } from 'react'
import { cookies } from 'next/headers'

import { AppSwitcher, type AppSwitcherApp } from '@876/ui/app-switcher'
import { NavProgress } from '@876/ui/nav-progress'
import type { OrgSwitcherOrg } from '@876/ui/org-switcher'
import type { SidebarUserMenuUser } from '@876/ui/sidebar-user-menu'
import {
  AppShell,
  AppShellBody,
  AppShellContent,
  AppShellHeader,
  AppShellMain,
  AppShellSidebarArea,
} from '@876/ui/app-shell'
import { SidebarTrigger } from '@876/ui/sidebar'

import type { ProjectsUiFeatures } from '@/types/features'
import type { NavGroupDefinition } from '@876/core/access'

import { Sidebar } from './sidebar'
import { NotificationBell } from './notification-bell'
import { GlobalAdd, FloatingGlobalAdd } from './global-add'
import { MobileNav } from './mobile-nav'
import { TabBar } from './tab-bar'
import { OrgSwitcher } from './org-switcher'
import { TopbarSearch } from './topbar-search'
import { UserMenu } from './user-menu'

export async function Shell({
  children,
  user,
  currentOrg,
  orgs,
  apps,
  uiFeatures,
  navigation,
  notificationCount = 0,
}: {
  children: ReactNode
  user: SidebarUserMenuUser
  currentOrg: OrgSwitcherOrg
  orgs: OrgSwitcherOrg[]
  apps: AppSwitcherApp[]
  uiFeatures: ProjectsUiFeatures
  navigation: NavGroupDefinition[]
  notificationCount?: number
}) {
  const sidebarCookie = (await cookies()).get('sidebar_state')
  const defaultSidebarOpen = sidebarCookie
    ? sidebarCookie.value === 'true'
    : true

  const searchNavigation = navigation.flatMap((group) =>
    group.entries.map(({ title, href }) => ({ title, href }))
  )

  return (
    <AppShell defaultOpen={defaultSidebarOpen}>
      <NavProgress />
      <AppShellSidebarArea>
        <Sidebar navigation={navigation} />
      </AppShellSidebarArea>
      <AppShellContent className="relative">
        <AppShellHeader className="hidden sm:flex">
          <SidebarTrigger />

          <div className="hidden min-w-0 flex-1 items-center sm:flex">
            {uiFeatures.searchBar ? (
              <TopbarSearch navigation={searchNavigation} />
            ) : null}
          </div>

          {/*
            Three groups, not one undifferentiated row: the organization you
            are acting for, the actions you can take, and who you are. The icon
            actions share a tighter gap than the gap between groups, so they
            read as one cluster, and a hairline marks each seam — which is what
            stops a control from looking like it belongs to its neighbour as
            more of them are added.

            Sizes match the shared AppSwitcher trigger (32px); the breathing
            room comes from the gaps, not from resizing one app's buttons. The
            seams stay narrow — the user menu ends the row, it is not a
            separate island floating away from it.
          */}
          <div className="ml-auto hidden items-center gap-2 sm:flex sm:gap-2.5">
            {uiFeatures.orgSwitcher ? (
              <>
                <OrgSwitcher current={currentOrg} orgs={orgs} />
                <span
                  aria-hidden="true"
                  className="bg-border/70 hidden h-5 w-px sm:block"
                />
              </>
            ) : null}

            <div className="flex items-center gap-1.5">
              <NotificationBell count={notificationCount} />
              {/* Sits where a help button would: raising a bug or a piece of
                  feedback should not require leaving the page you are on. */}
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
          <AppShellMain className="pt-[env(safe-area-inset-top)] pb-28 sm:pt-0 sm:pb-0">
            {children}
          </AppShellMain>
        </AppShellBody>
        <TabBar
          navigation={navigation}
          more={
            <MobileNav
              apps={apps}
              currentOrg={currentOrg}
              navigation={navigation}
              orgs={orgs}
              uiFeatures={uiFeatures}
              account={
                <>
                  {uiFeatures.searchBar ? (
                    <TopbarSearch navigation={searchNavigation} />
                  ) : null}
                  <UserMenu
                    user={user}
                    showThemeSwitcher={uiFeatures.themeSwitcher}
                  />
                </>
              }
            />
          }
        />
        {uiFeatures.globalAdd ? <FloatingGlobalAdd /> : null}
      </AppShellContent>
    </AppShell>
  )
}
