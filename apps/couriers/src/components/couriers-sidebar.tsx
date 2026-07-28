'use client'

import Link from 'next/link'

import { couriersNav } from './couriers-nav-config'
import { CouriersNavDropdown } from './couriers-nav-dropdown'
import { CouriersNavLink } from './couriers-nav-link'
import { Settings } from '@876/ui/icons'
import { OrgAvatar } from '@876/ui/org-avatar'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
} from '@876/ui/sidebar'

export function CouriersSidebar({
  basePath,
  tenantName,
  logoUrl,
}: {
  basePath: string
  tenantName: string
  logoUrl?: string | null
}) {
  return (
    <Sidebar collapsible="icon" className="border-sidebar-border/50 bg-sidebar">
      <SidebarHeader className="px-5 pt-5 pb-0 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:pt-3">
        <Link
          href={basePath}
          className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center"
        >
          <OrgAvatar
            name={tenantName}
            src={logoUrl}
            size="md"
            className="size-8 rounded-xl"
          />
          <span className="min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="block truncate text-lg leading-6 font-medium tracking-[-0.02em] text-[#202124] dark:text-white">
              {tenantName}
            </span>
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="flex flex-col px-3 pt-4 pb-4">
        <nav
          aria-label="Couriers sections"
          className="flex flex-1 flex-col gap-4"
        >
          {couriersNav.map((group) => (
            <SidebarGroup
              key={group.label || group.items[0]?.title}
              className="gap-1.5 p-0"
            >
              {group.label ? (
                <SidebarGroupLabel className="h-auto px-3 text-[0.6875rem] font-medium tracking-[0.04em] text-[#80868b] uppercase dark:text-white/40">
                  {group.label}
                </SidebarGroupLabel>
              ) : null}
              <div className="flex flex-col gap-1">
                {group.items.map((item) => {
                  const joinedItem = {
                    ...item,
                    href: basePath + item.href,
                    children: item.children?.map((child) => ({
                      ...child,
                      href: basePath + child.href,
                    })),
                  }

                  return item.children?.length ? (
                    <CouriersNavDropdown key={item.title} item={joinedItem} />
                  ) : (
                    <CouriersNavLink
                      key={item.title}
                      href={joinedItem.href}
                      title={item.title}
                      icon={item.icon}
                      color={item.color}
                    />
                  )
                })}
              </div>
            </SidebarGroup>
          ))}

          <div className="mt-auto">
            <CouriersNavLink
              href={`${basePath}/settings`}
              title="Settings"
              icon={Settings}
              color="var(--couriers-primary)"
              iconClassName="size-4"
            />
          </div>
        </nav>
      </SidebarContent>
    </Sidebar>
  )
}
