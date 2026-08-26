import type { ReactNode } from 'react'
import { cookies } from 'next/headers'

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

import { Sidebar } from './sidebar'
import { OrgSwitcher } from './org-switcher'
import { TopbarSearch } from './topbar-search'
import { UserMenu } from './user-menu'

export async function Shell({
  children,
  orgName,
  user,
  currentOrg,
  orgs,
}: {
  children: ReactNode
  orgName: string
  user: SidebarUserMenuUser
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
      <NavProgress />
      <AppShellSidebarArea>
        <Sidebar orgName={orgName} />
      </AppShellSidebarArea>
      <AppShellContent>
        <AppShellHeader className="border-b-0">
          <SidebarTrigger />

          <div className="flex min-w-0 flex-1 items-center">
            <TopbarSearch />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <OrgSwitcher current={currentOrg} orgs={orgs} />
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
