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

import type { ProjectsUiFeatures } from '@/types/features'
import type { NavGroupDefinition } from '@876/core/access'

import { Sidebar } from './sidebar'
import { GlobalAdd } from './global-add'
import { MobileNav } from './mobile-nav'
import { OrgSwitcher } from './org-switcher'
import { TopbarSearch } from './topbar-search'
import { UserMenu } from './user-menu'

export function Shell({
  children,
  user,
  currentOrg,
  orgs,
  apps,
  uiFeatures,
  navigation,
}: {
  children: ReactNode
  user: SidebarUserMenuUser
  currentOrg: OrgSwitcherOrg
  orgs: OrgSwitcherOrg[]
  apps: AppSwitcherApp[]
  uiFeatures: ProjectsUiFeatures
  navigation: NavGroupDefinition[]
}) {
  const searchNavigation = navigation.flatMap((group) =>
    group.entries.map(({ title, href }) => ({ title, href }))
  )

  return (
    <AppShell defaultOpen={false}>
      <NavProgress />
      <AppShellContent>
        <AppShellHeader>
          <Link
            href="/"
            aria-label="Projects home"
            className="focus-visible:ring-sidebar-ring flex items-center gap-2.5 rounded-lg transition-colors focus-visible:ring-2 focus-visible:outline-hidden"
          >
            <span className="border-border/60 bg-muted/20 flex size-8 shrink-0 items-center justify-center rounded-lg border shadow-2xs">
              <Logo className="text-foreground text-[0.8125rem] leading-none" />
            </span>
            <span className="text-foreground hidden text-sm font-semibold tracking-tight sm:inline-block">
              Projects
            </span>
          </Link>

          <div className="sm:hidden">
            <MobileNav
              apps={apps}
              currentOrg={currentOrg}
              navigation={navigation}
              orgs={orgs}
              uiFeatures={uiFeatures}
            />
          </div>

          <div className="hidden min-w-0 flex-1 items-center sm:flex">
            {uiFeatures.searchBar ? (
              <TopbarSearch navigation={searchNavigation} />
            ) : null}
          </div>

          {uiFeatures.searchBar ? (
            <div className="[&>button>svg]:text-muted-foreground ml-auto sm:hidden [&>button]:!flex [&>button]:!size-9 [&>button]:!w-9 [&>button]:!justify-center [&>button]:!p-0 [&>button]:text-transparent [&>button>kbd]:hidden [&>button>svg]:!mr-0">
              <TopbarSearch navigation={searchNavigation} />
            </div>
          ) : null}

          <div className="sm:hidden">
            <UserMenu
              user={user}
              showThemeSwitcher={uiFeatures.themeSwitcher}
            />
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
          <Sidebar navigation={navigation} />
          <AppShellMain>{children}</AppShellMain>
        </AppShellBody>
      </AppShellContent>
    </AppShell>
  )
}
