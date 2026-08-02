import type { ReactNode } from 'react'
import Link from 'next/link'
import { cookies } from 'next/headers'

import { MobileNav } from '@/components/shell/mobile-nav'
import { Sidebar } from '@/components/shell/sidebar'
import { UserMenu } from '@/components/shell/user-menu'
import { TopbarActions } from '@/components/shell/topbar-actions'
import { TopbarSearch } from '@/components/shell/topbar-search'
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

export type ShellUser = {
  name: string
  email: string
  avatar: string | null
  /** ISO country code for the identity flag stripe; defaults to Jamaica. */
  countryCode?: string | null
}

export async function Shell({
  children,
  widgetRail,
  user,
  uiFeatures = {
    themeSwitcher: false,
    globalAdd: false,
    appSwitcher: false,
    searchBar: false,
    chat: false,
  },
}: {
  children: ReactNode
  /**
   * Optional right-hand rail, composed by the caller. The shell places it but
   * knows nothing about what is in it — that is what keeps the shell free of
   * any product domain (see `.claude/rules/app-structure.md`).
   */
  widgetRail?: ReactNode
  user: ShellUser
  uiFeatures: {
    themeSwitcher: boolean
    globalAdd: boolean
    appSwitcher: boolean
    searchBar: boolean
    chat: boolean
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
        <Sidebar />
      </AppShellSidebarArea>

      <AppShellContent>
        <AppShellHeader className="border-b-0">
          <div className="flex items-center gap-2 md:hidden">
            <MobileNav />
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
            <UserMenu
              user={user}
              showThemeSwitcher={uiFeatures.themeSwitcher}
            />
          </div>
        </AppShellHeader>

        {/* Navbar spans full content width; dock sits under it beside main. */}
        <AppShellBody>
          <AppShellMain>{children}</AppShellMain>
          {widgetRail}
        </AppShellBody>
      </AppShellContent>
    </AppShell>
  )
}
