'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@876/core/utils'

import type { WorkspaceIconKey } from '../app-workspaces'
import { WorkspaceIcon } from './workspace-icon'

export type WorkspaceNavLink = {
  label: string
  href: string
  iconKey: WorkspaceIconKey
  exact: boolean
}

/**
 * The workspace rail — the app's own navigation, rendered inside Console.
 *
 * It is a rail rather than another tab strip on purpose. The organization page
 * already has a tab strip about the organization; a second horizontal strip
 * directly beneath it would read as more of the same, when the point is that
 * you have crossed into a different product. A rail down the side is the shape
 * the app itself uses, so an operator recognises where they are without a label
 * telling them.
 *
 * It collapses to a horizontal scroller below `lg`, where a rail would eat half
 * the viewport.
 */
export function WorkspaceNav({ links }: { links: WorkspaceNavLink[] }) {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Workspace sections"
      className="flex gap-1 overflow-x-auto p-2 lg:w-52 lg:shrink-0 lg:flex-col lg:overflow-visible"
    >
      {links.map((link) => {
        const isActive = link.exact
          ? pathname === link.href
          : pathname === link.href || pathname.startsWith(`${link.href}/`)

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[0.8125rem] font-medium whitespace-nowrap transition-colors',
              isActive
                ? 'bg-876-accent-fg/10 text-876-accent-fg'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <WorkspaceIcon iconKey={link.iconKey} className="size-4 shrink-0" />
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}
