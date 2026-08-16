'use client'

import Link from 'next/link'

import { cn } from '@876/core/utils'
import {
  Sidebar as BaseSidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
} from '@876/ui/sidebar'

import { navConfig } from './nav-config'
import { NavDropdown } from './nav-dropdown'
import { NavLink } from './nav-link'

export function InvoiceSidebar({ orgName }: { orgName: string }) {
  return (
    <BaseSidebar
      collapsible="icon"
      className="border-sidebar-border/50 bg-sidebar"
    >
      <SidebarHeader className="px-5 pt-5 pb-0 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:pt-3">
        <Link
          href="/"
          className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center"
        >
          <span className="border-sidebar-border flex size-8 shrink-0 items-center justify-center rounded-xl border text-xs font-bold text-[#202124] dark:text-white">
            876
          </span>
          <span className="min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="block truncate text-[0.9375rem] leading-6 font-semibold tracking-[-0.01em] text-[#202124] dark:text-white">
              {orgName}
            </span>
            <span className="text-muted-foreground block truncate text-xs">
              Invoice
            </span>
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="flex flex-col px-3 pt-4 pb-4">
        <nav
          aria-label="Invoice sections"
          className="flex flex-1 flex-col gap-4"
        >
          {navConfig.map((group, idx) => (
            <SidebarGroup
              key={group.label ?? `group-${idx}`}
              className={cn('gap-1.5 p-0', group.className)}
            >
              <div className="flex flex-col gap-1">
                {group.items.map((item) =>
                  item.children?.length ? (
                    <NavDropdown key={item.title} item={item} />
                  ) : (
                    <NavLink
                      key={item.title}
                      href={item.href}
                      title={item.title}
                      icon={item.icon}
                      color={item.color}
                    />
                  )
                )}
              </div>
            </SidebarGroup>
          ))}
        </nav>
      </SidebarContent>
    </BaseSidebar>
  )
}
