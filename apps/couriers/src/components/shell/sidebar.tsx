'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { nav } from './nav-config'
import { resolveSettingsNavIcon } from './nav-icons'
import { NavDropdown } from './nav-dropdown'
import { NavLink } from './nav-link'
import { isSettingsPath, settingsContext } from './settings-nav'
import { OrgAvatar } from '@876/ui/org-avatar'
import { ChevronsLeft } from '@876/ui/icons'
import {
  Sidebar as SidebarRoot,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
} from '@876/ui/sidebar'

export function Sidebar({
  basePath,
  tenantName,
  logoUrl,
}: {
  basePath: string
  tenantName: string
  logoUrl?: string | null
}) {
  const pathname = usePathname()
  const inSettings = isSettingsPath(pathname, basePath)

  return (
    <SidebarRoot variant="sidebar" collapsible="icon" className="bg-sidebar">
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
            <span className="text-sidebar-foreground block truncate text-lg leading-6 font-medium tracking-[-0.02em]">
              {tenantName}
            </span>
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="flex flex-col px-3 pt-4 pb-4">
        {inSettings ? (
          <SettingsNav basePath={basePath} />
        ) : (
          <AppNav basePath={basePath} />
        )}
      </SidebarContent>
    </SidebarRoot>
  )
}

function AppNav({ basePath }: { basePath: string }) {
  return (
    <nav aria-label="Couriers sections" className="flex flex-1 flex-col gap-4">
      {nav.map((group) => (
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
                href: item.href === '#' ? item.href : basePath + item.href,
                children: item.children?.map((child) => ({
                  ...child,
                  href: basePath + child.href,
                })),
              }

              return item.children?.length ? (
                <NavDropdown key={item.title} item={joinedItem} />
              ) : (
                <NavLink
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
    </nav>
  )
}

/**
 * The condensed settings rail: one page per item, with a back affordance to
 * the app rail. The same component renders on mobile, so the context switch
 * applies there with no second implementation.
 */
function SettingsNav({ basePath }: { basePath: string }) {
  const context = settingsContext(basePath)

  return (
    <nav aria-label="Settings sections" className="flex flex-1 flex-col gap-4">
      <div className="flex items-center gap-1 px-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
        <span className="text-sidebar-foreground min-w-0 flex-1 truncate text-[0.8125rem] font-semibold tracking-[-0.01em] group-data-[collapsible=icon]:hidden">
          Settings
        </span>
        <Link
          href={basePath}
          aria-label="Back to main navigation"
          className="text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-sidebar-ring flex size-7 shrink-0 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-hidden"
        >
          <ChevronsLeft aria-hidden="true" className="size-4" />
        </Link>
      </div>

      {context.groups.map((group) => (
        <SidebarGroup key={group.key} className="gap-1.5 p-0">
          <SidebarGroupLabel className="h-auto px-3 text-[0.6875rem] font-medium tracking-[0.04em] text-[#80868b] uppercase group-data-[collapsible=icon]:hidden dark:text-white/40">
            {group.label}
          </SidebarGroupLabel>
          <div className="flex flex-col gap-1">
            {group.entries.map((entry) => (
              <NavLink
                key={entry.key}
                href={entry.href}
                title={entry.title}
                icon={resolveSettingsNavIcon(entry.icon)}
              />
            ))}
          </div>
        </SidebarGroup>
      ))}
    </nav>
  )
}
