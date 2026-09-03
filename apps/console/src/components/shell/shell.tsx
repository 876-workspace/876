import { resolveNavigation } from '@876/core/access'
import {
  AppShell,
  AppShellBody,
  AppShellContent,
  AppShellHeader,
  AppShellMain,
} from '@876/ui/app-shell'
import { Logo } from '@876/ui/logo'
import { NavProgress } from '@876/ui/nav-progress'
import Link from 'next/link'
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
   * The left rail, composed by the caller from the `@sidebar` parallel route
   * slot. It arrives as a node rather than being rendered here because a route
   * segment contributes its own context with data only that segment has — an
   * app record knows its `app_kind`; the shell above it does not.
   */
  sidebar: ReactNode
  /**
   * The mobile navigation sheet, composed by the caller from the `@mobilenav`
   * parallel route slot. It is a separate slot from `sidebar` because it
   * renders in the header, above the body — it cannot read the sidebar's node,
   * and hard-coding the platform contexts here is what left a phone showing the
   * platform rail inside an app record.
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
  const context = await resolveAccessContext(userId)
  const navigation = context ? resolveNavigation(navConfig, context) : []
  const settings = context ? resolveSettingsOptions(context) : []
  const searchItems = [
    // Children are searchable too, titled by their section, so “Labels” and
    // “Forms” are reachable from the command bar without first knowing which
    // rail icon hides them.
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
    <AppShell defaultOpen={false}>
      <NavProgress />

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

          <Link
            href="/"
            aria-label="Console home"
            className="focus-visible:ring-sidebar-ring hidden items-center gap-2.5 rounded-lg transition-colors focus-visible:ring-2 focus-visible:outline-hidden md:flex"
          >
            <span className="border-border/60 bg-muted/20 flex size-8 shrink-0 items-center justify-center rounded-lg border shadow-2xs">
              <Logo className="text-foreground text-[0.8125rem] leading-none" />
            </span>
            <span className="text-foreground text-sm font-semibold tracking-tight">
              Console
            </span>
          </Link>

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

        <AppShellBody className="flex-col md:flex-row">
          {sidebar}
          <AppShellMain>{children}</AppShellMain>
          {widgetRail}
        </AppShellBody>
      </AppShellContent>
    </AppShell>
  )
}
