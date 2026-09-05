'use client'

import Link from 'next/link'

import type { NavGroupDefinition } from '@876/core/access'
import { cn } from '@876/core/utils'
import {
  Sidebar as BaseSidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
} from '@876/ui/sidebar'

import { resolveInvoiceNavIcon } from './nav-icons'
import { NavLink } from './nav-link'

export function InvoiceSidebar({
  orgName,
  navigation,
}: {
  orgName: string
  navigation: NavGroupDefinition[]
}) {
  return (
    <BaseSidebar variant="sidebar" collapsible="icon" className="bg-sidebar">
      <SidebarHeader className="px-5 pt-5 pb-0 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:pt-3">
        <Link
          href="/"
          className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center"
        >
          <span className="border-sidebar-border text-sidebar-foreground flex size-8 shrink-0 items-center justify-center rounded-xl border text-xs font-bold">
            876
          </span>
          <span className="min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="text-sidebar-foreground block truncate text-[0.9375rem] leading-6 font-semibold tracking-[-0.01em]">
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
          {navigation.map((group, idx) => (
            <SidebarGroup
              key={group.key ?? `group-${idx}`}
              className={cn(
                'gap-1.5 p-0',
                group.key === 'secondary' && 'mt-auto'
              )}
            >
              <div className="flex flex-col gap-1">
                {group.entries.map((item) => (
                  <NavLink
                    key={item.key}
                    href={item.href}
                    title={item.title}
                    icon={resolveInvoiceNavIcon(item.icon)}
                    colorClassName={item.colorClassName}
                  />
                ))}
              </div>
            </SidebarGroup>
          ))}
        </nav>
      </SidebarContent>
    </BaseSidebar>
  )
}
