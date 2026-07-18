import type { ReactNode } from 'react'
import Link from 'next/link'
import { cookies } from 'next/headers'
import type { AdminAuditEvent } from '@876/admin'

import { ConsoleMobileNav } from './console-mobile-nav'
import { ConsoleSidebar } from './console-sidebar'
import { ConsoleUserMenu } from './console-user-menu'
import { WidgetBar } from './widgets/widget-bar'
import { TopbarActions } from './topbar-actions'
import { TopbarSearch } from './topbar-search'
import { Logo } from '@876/ui/logo'
import { SidebarTrigger } from '@876/ui/sidebar'
import {
  AppShell,
  AppShellSidebarArea,
  AppShellContent,
  AppShellHeader,
  AppShellBody,
  AppShellMain,
} from '@876/ui/app-shell'

export type ConsoleShellUser = {
  name: string
  email: string
  avatar: string | null
  /** ISO country code for the identity flag stripe; defaults to Jamaica. */
  countryCode?: string | null
}

export async function ConsoleShell({
  children,
  auditEvents,
  user,
  enabledWidgetIds,
  uiFeatures = {
    themeSwitcher: false,
    globalAdd: false,
    appSwitcher: false,
    searchBar: false,
  },
}: {
  children: ReactNode
  auditEvents: AdminAuditEvent[]
  user: ConsoleShellUser
  enabledWidgetIds: string[]
  uiFeatures: {
    themeSwitcher: boolean
    globalAdd: boolean
    appSwitcher: boolean
    searchBar: boolean
  }
}) {
  const cookieStore = await cookies()
  const sidebarCookie = cookieStore.get('sidebar_state')
  const defaultSidebarOpen = sidebarCookie
    ? sidebarCookie.value === 'true'
    : true

  return (
    <AppShell defaultOpen={defaultSidebarOpen}>
      <AppShellSidebarArea className="hidden md:contents">
        <ConsoleSidebar />
      </AppShellSidebarArea>

      <AppShellContent>
        <AppShellHeader>
          <div className="flex items-center gap-2 md:hidden">
            <ConsoleMobileNav />
            <Link
              href="/"
              aria-label="Console home"
              className="border-sidebar-border focus-visible:ring-sidebar-ring flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors hover:bg-[#f1f3f4] focus-visible:ring-2 focus-visible:outline-hidden dark:hover:bg-white/8"
            >
              <Logo className="text-sm leading-none text-[#202124] dark:text-white" />
            </Link>
          </div>
          <SidebarTrigger className="hidden md:flex" />

          <div className="hidden min-w-0 flex-1 items-center md:flex">
            {uiFeatures.searchBar && <TopbarSearch />}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden md:flex">
              <TopbarActions
                showGlobalAdd={uiFeatures.globalAdd}
                showAppSwitcher={uiFeatures.appSwitcher}
              />
            </div>
            <ConsoleUserMenu
              user={user}
              showThemeSwitcher={uiFeatures.themeSwitcher}
            />
          </div>
        </AppShellHeader>

        {/* Navbar spans full content width; dock sits under it beside main. */}
        <AppShellBody>
          <AppShellMain>{children}</AppShellMain>
          {enabledWidgetIds.length > 0 && (
            <WidgetBar
              auditEvents={auditEvents}
              enabledWidgetIds={enabledWidgetIds}
            />
          )}
        </AppShellBody>
      </AppShellContent>
    </AppShell>
  )
}
