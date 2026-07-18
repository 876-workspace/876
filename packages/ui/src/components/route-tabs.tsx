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
          const excluded =
            tab.excludePrefixes?.some((p) => pathname.startsWith(p)) ?? false
          const isActive =
            !excluded &&
            (tab.exact
              ? pathname === tab.href
              : pathname === tab.href || pathname.startsWith(`${tab.href}/`))

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
                        ? 'border-876-accent-fg text-876-accent-fg'
                        : 'text-muted-foreground hover:text-foreground border-transparent'
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
