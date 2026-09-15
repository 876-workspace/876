'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import type { NavGroupDefinition } from '@876/core/access'
import { cn } from '@876/core/utils'

import { isActiveProjectsPath } from './nav-link'
import { NavIcon } from './nav-icons'

// iOS tab bars hold at most five tabs; the fifth is always "More".
const MAX_PRIMARY_TABS = 4

/**
 * The phone navigation: a bottom tab bar in the thumb zone instead of a
 * hamburger drawer. Overflow destinations live behind the "More" tab.
 */
export function TabBar({
  navigation,
  more,
}: {
  navigation: NavGroupDefinition[]
  more: ReactNode
}) {
  const pathname = usePathname()
  const tabs = navigation
    .flatMap((group) => group.entries)
    .slice(0, MAX_PRIMARY_TABS)

  return (
    <nav
      aria-label="Tabs"
      className="pointer-events-none absolute inset-x-0 bottom-0 z-30 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:hidden"
    >
      <div className="tab-bar pointer-events-auto flex items-stretch rounded-full border p-1 backdrop-blur-2xl backdrop-saturate-150">
        {tabs.map((tab) => {
          const active = isActiveProjectsPath(pathname, tab.href)

          return (
            <Link
              key={tab.key}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex h-13 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-full text-[0.625rem] font-medium transition-colors focus-visible:outline-hidden',
                active
                  ? 'bg-foreground/[0.06] text-foreground dark:bg-white/10'
                  : 'text-muted-foreground active:text-foreground'
              )}
            >
              <NavIcon icon={tab.icon} className="size-6" />
              <span className="max-w-full truncate">{tab.title}</span>
            </Link>
          )
        })}
        {more}
      </div>
    </nav>
  )
}
