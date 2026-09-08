import type { ReactNode } from 'react'
import Link from 'next/link'

import { AppSwitcher, type AppSwitcherApp } from '@876/ui/app-switcher'
import { Logo } from '@876/ui/logo'
import { NavProgress } from '@876/ui/nav-progress'
import type { OrgSwitcherOrg } from '@876/ui/org-switcher'
import type { SidebarUserMenuUser } from '@876/ui/sidebar-user-menu'
import {
  AppShell,
  AppShellBody,
  AppShellContent,
  AppShellHeader,
  AppShellMain,
} from '@876/ui/app-shell'

import type { CrmUiFeatures } from '@/types/features'
import type { NavGroupDefinition } from '@876/core/access'

import { Sidebar } from './sidebar'
import { GlobalAdd } from './global-add'
import { MobileNav } from './mobile-nav'
import { OrgSwitcher } from './org-switcher'
import { SupportWidget } from './support-widget'
import { TopbarSearch } from './topbar-search'
import { UserMenu } from './user-menu'

export function Shell({
  children,
  orgName,
  user,
  currentOrg,
  orgs,
  apps,
  uiFeatures,
  navigation,
}: {
  children: ReactNode
  orgName: string
  user: SidebarUserMenuUser
  currentOrg: OrgSwitcherOrg
  orgs: OrgSwitcherOrg[]
  apps: AppSwitcherApp[]
  uiFeatures: CrmUiFeatures
  navigation: NavGroupDefinition[]
}) {
  return (
    <AppShell defaultOpen={false}>
      <NavProgress />
      <AppShellContent>
        <AppShellHeader>
          <div className="flex items-center gap-2">
            <div className="md:hidden">
              <MobileNav orgName={orgName} navigation={navigation} />
            </div>
            <Link
              href="/"
              aria-label="CRM home"
              className="focus-visible:ring-sidebar-ring flex items-center gap-2.5 rounded-lg transition-colors focus-visible:ring-2 focus-visible:outline-hidden"
            >
              <span className="border-border/60 bg-muted/20 flex size-8 shrink-0 items-center justify-center rounded-lg border shadow-2xs">
                <Logo className="text-foreground text-[0.8125rem] leading-none" />
              </span>
              <span className="text-foreground hidden text-sm font-semibold tracking-tight md:inline-block">
                CRM
              </span>
            </Link>
          </div>

          <div className="flex min-w-0 flex-1 items-center">
            {uiFeatures.searchBar && (
              <TopbarSearch
                navigation={navigation.flatMap((group) =>
                  group.entries.map(({ title, href }) => ({ title, href }))
                )}
              />
            )}
          </div>

          <div className="ml-auto flex items-center gap-2 sm:gap-2.5">
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
              <SupportWidget />
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
          <Sidebar navigation={navigation} />
          <AppShellMain>{children}</AppShellMain>
        </AppShellBody>
      </AppShellContent>
    </AppShell>
  )
}
