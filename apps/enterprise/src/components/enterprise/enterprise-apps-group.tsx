'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { ChevronDown, LayoutGrid } from '@876/ui/icons'
import { cn } from '@876/core/utils'

import { EnterpriseNavLink } from './enterprise-nav-link'

/** Thin wrapper used by the server component — no icon prop crosses the boundary. */
export function EnterpriseAppNavLink({
  href,
  title,
  logoUrl,
}: {
  href: string
  title: string
  logoUrl?: string | null
}) {
  return (
    <EnterpriseNavLink
      href={href}
      title={title}
      icon={LayoutGrid}
      color="var(--876-blue)"
      logoUrl={logoUrl}
    />
  )
}
import { SidebarGroup, SidebarGroupLabel } from '@876/ui/sidebar'

import {
  navLinkActive,
  navLinkBase,
  navLinkRest,
  isActiveEnterprisePath,
} from './enterprise-nav-link'

export function EnterpriseAppsGroup({
  orgSlug,
  children,
}: {
  orgSlug: string
  children?: ReactNode
}) {
  const pathname = usePathname()
  const allHref = `/${orgSlug}/apps`
  const isAllActive = isActiveEnterprisePath(pathname, allHref)
  // Collapsed by default — the apps list should not auto-expand on load.
  const [open, setOpen] = useState(false)

  return (
    <SidebarGroup className="gap-1.5 p-0">
      <SidebarGroupLabel className="uppercase">Apps</SidebarGroupLabel>
      <div className="flex flex-col gap-1">
        {/* "All" row — link on the left, chevron toggle on the right */}
        <div className="flex items-center gap-1">
          <Link
            href={allHref}
            aria-current={isAllActive ? 'page' : undefined}
            className={cn(
              navLinkBase,
              'min-h-[2.25rem] flex-1 px-3 py-1.5 text-[0.8125rem] leading-5 font-normal',
              'group-data-[collapsible=icon]:size-9 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0',
              isAllActive ? navLinkActive : navLinkRest
            )}
          >
            <LayoutGrid
              aria-hidden="true"
              className="size-[1.125rem] shrink-0 transition-colors"
              style={{ color: 'var(--876-blue)' }}
            />
            <span className="truncate group-data-[collapsible=icon]:hidden">
              All
            </span>
          </Link>

          {children ? (
            <button
              type="button"
              aria-label={open ? 'Collapse apps' : 'Expand apps'}
              onClick={() => setOpen((v) => !v)}
              className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-md transition-colors',
                'text-[#3c4043] hover:bg-[#f1f3f4] dark:text-white/75 dark:hover:bg-white/8',
                'group-data-[collapsible=icon]:hidden'
              )}
            >
              <ChevronDown
                className={cn(
                  'size-3.5 transition-transform duration-200',
                  open && 'rotate-180'
                )}
              />
            </button>
          ) : null}
        </div>

        {/* Collapsible app list */}
        {open && children ? (
          <div className="flex flex-col gap-1 pl-3 group-data-[collapsible=icon]:pl-0">
            {children}
          </div>
        ) : null}
      </div>
    </SidebarGroup>
  )
}
