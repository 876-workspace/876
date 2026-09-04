'use client'

import { useState } from 'react'
import type { NavGroupDefinition } from '@876/core/access'
import { cn } from '@876/core/utils'
import type { AppSwitcherApp } from '@876/ui/app-switcher'
import { AppSwitcher } from '@876/ui/app-switcher'
import { Logo } from '@876/ui/logo'
import type { OrgSwitcherOrg } from '@876/ui/org-switcher'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@876/ui/sheet'
import { MenuIcon, Settings } from '@876/ui/icons'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import type { ProjectsUiFeatures } from '@/types/features'

import { GlobalAdd } from './global-add'
import { OrgSwitcher } from './org-switcher'
import { isActiveCrmPath } from './nav-link'
import { sidebarIcons } from './sidebar'

const mobileNavItemBase =
  'focus-visible:ring-sidebar-ring flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[0.9375rem] leading-5 transition-colors focus-visible:ring-2 focus-visible:outline-hidden'
const mobileNavItemRest =
  'text-foreground hover:bg-muted/70 active:bg-muted dark:hover:bg-white/8'
const mobileNavItemActive =
  'bg-[var(--876-nav-active-bg)] text-[var(--876-nav-active-fg)] font-medium shadow-sm ring-1 ring-[var(--876-nav-active-fg)]/15'

export function MobileNav({
  apps,
  currentOrg,
  navigation,
  orgs,
  uiFeatures,
}: {
  apps: AppSwitcherApp[]
  currentOrg: OrgSwitcherOrg
  navigation: NavGroupDefinition[]
  orgs: OrgSwitcherOrg[]
  uiFeatures: ProjectsUiFeatures
}) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label="Open navigation"
        className="focus-visible:ring-sidebar-ring text-foreground hover:bg-muted/70 active:bg-muted flex size-11 shrink-0 items-center justify-center rounded-xl transition-colors focus-visible:ring-2 focus-visible:outline-hidden dark:hover:bg-white/8"
      >
        <MenuIcon aria-hidden="true" className="size-5" />
      </SheetTrigger>

      <SheetContent
        side="left"
        className="876-surface border-876-surface-border bg-876-surface w-[min(22rem,calc(100vw-1rem))] max-w-none gap-0 overflow-hidden p-0 shadow-[0_18px_60px_rgba(0,0,0,0.18)] dark:shadow-[0_18px_60px_rgba(0,0,0,0.35)]"
      >
        <SheetHeader className="border-876-surface-border border-b px-4 py-4 pr-14">
          <div className="flex items-center gap-3">
            <span className="border-876-surface-border bg-876-canvas flex size-9 shrink-0 items-center justify-center rounded-xl border">
              <Logo className="text-foreground text-[0.8125rem] leading-none" />
            </span>
            <SheetTitle className="text-foreground text-base leading-6">
              Projects
            </SheetTitle>
          </div>
          <SheetDescription className="sr-only">
            Projects navigation
          </SheetDescription>
        </SheetHeader>

        <nav
          aria-label="Projects navigation"
          className="min-h-0 flex-1 overflow-y-auto px-3 py-4"
        >
          <div className="flex flex-col gap-1">
            {navigation.map((group, groupIndex) => (
              <div key={group.key} className="flex flex-col gap-1">
                {groupIndex > 0 ? (
                  <div className="border-876-surface-border my-2 border-t" />
                ) : null}
                {group.entries.map((item) => {
                  const Icon =
                    sidebarIcons[item.icon as keyof typeof sidebarIcons] ??
                    Settings
                  const active = isActiveCrmPath(pathname, item.href)

                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      onClick={() => setOpen(false)}
                      className={cn(
                        mobileNavItemBase,
                        active ? mobileNavItemActive : mobileNavItemRest
                      )}
                    >
                      <span className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-lg dark:bg-white/8">
                        <Icon
                          aria-hidden="true"
                          className={cn('size-[1.125rem]', item.colorClassName)}
                        />
                      </span>
                      <span className="min-w-0 flex-1 truncate">
                        {item.title}
                      </span>
                    </Link>
                  )
                })}
              </div>
            ))}
          </div>
        </nav>

        {uiFeatures.orgSwitcher ||
        uiFeatures.globalAdd ||
        uiFeatures.appSwitcher ? (
          <SheetFooter className="border-876-surface-border border-t px-4 py-3">
            <div className="flex items-center gap-2">
              {uiFeatures.orgSwitcher ? (
                <OrgSwitcher current={currentOrg} orgs={orgs} />
              ) : null}
              <div className="ml-auto flex items-center gap-1.5">
                {uiFeatures.globalAdd ? <GlobalAdd /> : null}
                {uiFeatures.appSwitcher ? <AppSwitcher apps={apps} /> : null}
              </div>
            </div>
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
