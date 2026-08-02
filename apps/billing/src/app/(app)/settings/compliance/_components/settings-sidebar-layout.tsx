'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@876/core/utils'
import {
  CircleStackIcon,
  Globe2,
  Hash,
  ChevronLeft,
  type IconComponent,
} from '@876/ui/icons'

/**
 * Icons are referenced by string key so the server layout can pass items
 * across the RSC boundary (same convention as ResourceToolbar actions).
 */
const SECTION_ICONS = {
  'circle-stack': CircleStackIcon,
  globe: Globe2,
  hash: Hash,
} satisfies Record<string, IconComponent>

const NAV_COOKIE = 'settings_nav_collapsed'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days, matching the main sidebar

type SettingsNavItem = { label: string; href: string; icon: string }

/**
 * Two-pane settings surface: a compact, auto-height navigation panel (a white
 * 876-card that hugs its items) floating in the upper third of a sticky
 * left column, beside a slate content field whose content stays top-aligned.
 * The panel collapses to icons via the toggle on its right edge; the choice
 * persists in the `settings_nav_collapsed` cookie so the server can render
 * the correct width with no flash.
 */
export function SettingsSidebarLayout({
  children,
  items,
  defaultCollapsed = false,
}: {
  children: React.ReactNode
  items: SettingsNavItem[]
  defaultCollapsed?: boolean
}) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(defaultCollapsed)

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      document.cookie = `${NAV_COOKIE}=${next}; path=/; max-age=${COOKIE_MAX_AGE}`
      return next
    })
  }, [])

  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-start">
      <div className="shrink-0 md:sticky md:top-0 md:h-[calc(100svh-3.5rem)] md:pt-[22vh]">
        <aside
          data-collapsed={collapsed || undefined}
          className={cn(
            '876-card relative w-full p-2',
            'transition-[width] duration-200 ease-linear motion-reduce:transition-none',
            collapsed ? 'md:w-16' : 'md:w-56'
          )}
        >
          <nav
            aria-label="Compliance settings"
            className="flex gap-1 overflow-x-auto md:flex-col md:overflow-x-visible"
          >
            {items.map((item) => {
              const Icon =
                SECTION_ICONS[item.icon as keyof typeof SECTION_ICONS]
              const active =
                pathname === item.href || pathname?.startsWith(`${item.href}/`)

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    'flex shrink-0 items-center gap-3 rounded-lg px-3 py-2 text-[0.8125rem] leading-5 transition-colors',
                    collapsed && 'md:justify-center md:px-0',
                    active
                      ? 'bg-[var(--876-nav-active-bg)] font-medium text-[var(--876-nav-active-fg)]'
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  )}
                >
                  {Icon ? (
                    <Icon aria-hidden="true" className="size-4 shrink-0" />
                  ) : null}
                  <span className={cn('truncate', collapsed && 'md:hidden')}>
                    {item.label}
                  </span>
                </Link>
              )
            })}
          </nav>

          <button
            type="button"
            onClick={toggle}
            aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
            aria-expanded={!collapsed}
            className={cn(
              'bg-876-surface border-876-surface-border text-muted-foreground hover:text-foreground',
              'focus-visible:ring-ring absolute top-1/2 -right-3 z-20 hidden size-6 -translate-y-1/2',
              'items-center justify-center rounded-full border shadow-sm transition-colors',
              'focus-visible:ring-2 focus-visible:outline-none md:flex'
            )}
          >
            <ChevronLeft
              aria-hidden="true"
              className={cn(
                'size-3.5 transition-transform duration-200 motion-reduce:transition-none',
                collapsed && 'rotate-180'
              )}
            />
          </button>
        </aside>
      </div>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
