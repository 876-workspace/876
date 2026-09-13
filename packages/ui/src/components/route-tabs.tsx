'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '../lib/utils'

export type RouteTabItem = {
  label: React.ReactNode
  href: string
  /** When true, only matches on an exact pathname (used for the index tab). */
  exact?: boolean
  /** When true, hide this tab unless it is currently the active route. */
  hideUnlessActive?: boolean
  /**
   * Pathname prefixes that suppress the startsWith match. Useful when a
   * sibling tab's route is nested under this tab's href.
   */
  excludePrefixes?: string[]
}

/**
 * Whether a route tab matches the current pathname.
 *
 * Exported so every tab presentation — the page-level strip and the
 * `DetailCardRouteTabs` strip inside a record card — resolves "active" the
 * same way.
 */
export function isRouteTabActive(tab: RouteTabItem, pathname: string): boolean {
  const excluded =
    tab.excludePrefixes?.some((prefix) => pathname.startsWith(prefix)) ?? false
  if (excluded) return false

  return tab.exact
    ? pathname === tab.href
    : pathname === tab.href || pathname.startsWith(`${tab.href}/`)
}

export interface RouteTabsProps extends React.HTMLAttributes<HTMLElement> {
  tabs: RouteTabItem[]
  variant?: 'line' | 'pill'
}

export const RouteTabs = React.forwardRef<HTMLElement, RouteTabsProps>(
  ({ tabs, variant = 'line', className, ...props }, ref) => {
    const pathname = usePathname()

    return (
      <nav
        ref={ref}
        aria-label="Detail sections"
        className={cn(
          'flex overflow-x-auto',
          variant === 'line'
            ? '-mb-px gap-1'
            : 'bg-muted w-fit items-center gap-1 rounded-lg p-[3px]',
          className
        )}
        {...props}
      >
        {tabs.map((tab) => {
          const isActive = isRouteTabActive(tab, pathname)

          if (tab.hideUnlessActive && !isActive) return null

          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'relative inline-flex items-center text-[0.8125rem] font-medium whitespace-nowrap transition-all',
                variant === 'line'
                  ? cn(
                      'border-b-2 px-3 py-2.5',
                      isActive
                        ? 'border-876-blue text-876-blue'
                        : 'text-muted-foreground hover:text-foreground hover:border-876-surface-border border-transparent'
                    )
                  : cn(
                      'rounded-md px-3 py-1.5',
                      isActive
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )
              )}
            >
              {tab.label}
            </Link>
          )
        })}
      </nav>
    )
  }
)
RouteTabs.displayName = 'RouteTabs'
