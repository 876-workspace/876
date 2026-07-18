'use client'

import Link from 'next/link'

import { cn } from '@876/core/utils'
import {
  Sidebar as BaseSidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
} from '@876/ui/sidebar'

import { getVisibleNav } from './billing-nav-config'
import { NavDropdown } from './billing-nav-dropdown'
import { NavLink } from './billing-nav-link'
import type { Permission } from '@/types/access'
import type { BillingProductFeatures } from '@/types/features'

export function WorkspaceSidebar({
  tenantName,
  permissions,
  productFeatures,
}: {
  tenantName: string
  permissions: Permission[]
  productFeatures: BillingProductFeatures
}) {
  const visibleNav = getVisibleNav(permissions, productFeatures)

  return (
    <BaseSidebar
      collapsible="icon"
      className="border-sidebar-border bg-sidebar"
    >
      <SidebarHeader className="px-5 pt-5 pb-0 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:pt-3">
        <Link
          href="/"
          className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center"
        >
          <span className="border-sidebar-border flex size-8 shrink-0 items-center justify-center rounded-xl border text-xs font-bold text-[#202124] dark:text-white">
            B
          </span>
          <span className="min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="block truncate text-[0.9375rem] leading-6 font-semibold tracking-[-0.01em] text-[#202124] dark:text-white">
              {tenantName}
            </span>
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="flex flex-col px-3 pt-4 pb-4">
        <nav
          aria-label="Billing sections"
          className="flex flex-1 flex-col gap-4"
        >
          {visibleNav.map((group) => (
            <SidebarGroup
              key={group.label || group.items[0]?.title}
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
