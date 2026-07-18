'use client'

import Link from 'next/link'

import { consoleNav, consoleSettingsItem } from './console-nav-config'
import { ConsoleNavDropdown } from './console-nav-dropdown'
import { ConsoleNavLink } from './console-nav-link'
import { Logo } from '@876/ui/logo'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
} from '@876/ui/sidebar'

export function ConsoleSidebar() {
  return (
    <Sidebar collapsible="icon" className="border-sidebar-border bg-sidebar">
      <SidebarHeader className="px-5 pt-5 pb-0 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:pt-3">
        <Link
          href="/"
          className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center"
        >
          <span className="border-sidebar-border flex size-8 shrink-0 items-center justify-center rounded-xl border">
            <Logo className="text-sm leading-none text-[#202124] dark:text-white" />
          </span>
          <span className="min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="block truncate text-[0.9375rem] leading-6 font-semibold tracking-[-0.01em] text-[#202124] dark:text-white">
              Console
            </span>
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="flex flex-col px-3 pt-4 pb-4">
        <nav
          aria-label="Console sections"
          className="flex flex-1 flex-col gap-4"
        >
          {consoleNav.map((group) => (
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
                {group.items.map((item) =>
                  item.children?.length ? (
                    <ConsoleNavDropdown key={item.title} item={item} />
                  ) : (
                    <ConsoleNavLink
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

          {/* Settings pinned at the bottom of the nav */}
          <div className="mt-auto">
            <ConsoleNavLink
              href={consoleSettingsItem.href}
              title={consoleSettingsItem.title}
              icon={consoleSettingsItem.icon}
              color={consoleSettingsItem.color}
            />
          </div>
        </nav>
      </SidebarContent>
    </Sidebar>
  )
}
