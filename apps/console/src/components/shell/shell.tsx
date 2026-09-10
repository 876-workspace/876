import { resolveNavigation } from '@876/core/access'
import {
  AppShell,
  AppShellBody,
  AppShellContent,
  AppShellHeader,
  AppShellMain,
  AppShellSidebarArea,
} from '@876/ui/app-shell'
import { Logo } from '@876/ui/logo'
import { NavProgress } from '@876/ui/nav-progress'
import { SidebarTrigger } from '@876/ui/sidebar'
import Link from 'next/link'
import { cookies } from 'next/headers'
import type { ReactNode } from 'react'

import { navConfig } from '@/components/shell/nav-config'
import { resolveSettingsOptions } from '@/components/shell/settings-options'
import { TopbarActions } from '@/components/shell/topbar-actions'
import { TopbarSearch } from '@/components/shell/topbar-search'
import { UserMenu } from '@/components/shell/user-menu'
import { resolveAccessContext } from '@/lib/auth/access-context'

export type ShellUser = {
  name: string
  email: string
  avatar: string | null
  /** ISO country code for the identity flag stripe; defaults to Jamaica. */
  countryCode?: string | null
}

export async function Shell({
  children,
  sidebar,
  mobileNav,
  widgetRail,
  userId,
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
   * The desktop navigation composed by the `@sidebar` parallel route. A route
   * segment can contribute context that only that segment knows, while the
   * shell remains responsible only for standard sidebar placement.
   */
  sidebar: ReactNode
  /**
   * The mobile navigation sheet, composed independently by `@mobilenav` so it
   * receives the same route-owned contexts as the desktop sidebar.
   */
  mobileNav: ReactNode
  /**
   * Optional right-hand rail, composed by the caller. The shell places it but
   * knows nothing about what is in it — that is what keeps the shell free of
   * any product domain (see `.claude/rules/app-structure.md`).
   */
  widgetRail?: ReactNode
  userId: string
  user: ShellUser
  uiFeatures: {
    themeSwitcher: boolean
    globalAdd: boolean
    appSwitcher: boolean
    searchBar: boolean
    chat: boolean
  }
}) {
  const [context, cookieStore] = await Promise.all([
    resolveAccessContext(userId),
    cookies(),
  ])
  const navigation = context ? resolveNavigation(navConfig, context) : []
  const settings = context ? resolveSettingsOptions(context) : []
  const sidebarCookie = cookieStore.get('sidebar_state')
  const defaultSidebarOpen = sidebarCookie
    ? sidebarCookie.value === 'true'
    : true
  const searchItems = [
    // Children are searchable too, titled by their section, so “Labels” and
    // “Forms” are reachable from the command bar without first knowing which
    // sidebar context contains them.
    ...navigation.flatMap((group) =>
      group.entries.flatMap((item) => [
        { group: 'Navigation', title: item.title, href: item.href },
        ...(item.children ?? [])
          .filter((child) => child.href !== item.href)
          .map((child) => ({
            group: 'Navigation',
            title: `${item.title} › ${child.title}`,
            href: child.href,
          })),
      ])
    ),
    ...settings.map((item) => ({
      group: 'Settings',
      title: item.title,
      href: item.href,
    })),
  ]

  return (
    <AppShell defaultOpen={defaultSidebarOpen}>
      <NavProgress />

      <AppShellSidebarArea className="hidden md:contents">
        {sidebar}
      </AppShellSidebarArea>

      <AppShellContent>
        <AppShellHeader>
          <div className="flex items-center gap-2 md:hidden">
            {mobileNav}
            <Link
              href="/"
              aria-label="Console home"
              className="border-sidebar-border focus-visible:ring-sidebar-ring flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors hover:bg-[#f1f3f4] focus-visible:ring-2 focus-visible:outline-hidden dark:hover:bg-white/8"
            >
              <Logo className="text-sidebar-foreground text-[0.8125rem] leading-none" />
            </Link>
          </div>

          <div className="hidden md:block">
            <SidebarTrigger />
          </div>

          <div className="hidden min-w-0 flex-1 items-center md:flex">
            {uiFeatures.searchBar && <TopbarSearch items={searchItems} />}
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

        <AppShellBody>
          <AppShellMain>{children}</AppShellMain>
          {widgetRail}
        </AppShellBody>
      </AppShellContent>
    </AppShell>
  )
}
