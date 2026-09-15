'use client'

import Link from 'next/link'
import type { NavGroupDefinition } from '@876/core/access'
import { Logo } from '@876/ui/logo'
import {
  Sidebar as SidebarRoot,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  useSidebar,
} from '@876/ui/sidebar'

import { resolveNavIcon } from './nav-icons'
import { NavLink } from './nav-link'

export function Sidebar({ navigation }: { navigation: NavGroupDefinition[] }) {
  const { state, isMobile } = useSidebar()
  const expanded = isMobile || state === 'expanded'

  return (
    <SidebarRoot variant="sidebar" collapsible="icon" className="bg-sidebar">
      <SidebarHeader className="px-5 pt-5 pb-0 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:pt-3">
        <Link
          href="/"
          aria-label="Projects home"
          className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center"
        >
          <span className="border-border/60 bg-muted/20 flex size-8 shrink-0 items-center justify-center rounded-xl border shadow-2xs">
            <Logo className="text-foreground text-[0.8125rem] leading-none" />
          </span>
          <span className="text-sidebar-foreground truncate text-lg leading-6 font-medium tracking-[-0.02em] group-data-[collapsible=icon]:hidden">
            Projects
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="flex flex-col px-3 pt-4 pb-4 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-2">
        <nav
          aria-label="Projects navigation"
          className="flex flex-1 flex-col gap-4"
        >
          {navigation.map((group) => (
            <SidebarGroup
              key={group.key}
              className="gap-1 p-0 group-data-[collapsible=icon]:items-center"
            >
              {group.entries.map((item) => (
                <NavLink
                  key={item.key}
                  href={item.href}
                  title={item.title}
                  icon={resolveNavIcon(item.icon)}
                  colorClassName={item.colorClassName}
                  expanded={expanded}
                  side="right"
                />
              ))}
            </SidebarGroup>
          ))}
        </nav>
      </SidebarContent>
    </SidebarRoot>
  )
}
