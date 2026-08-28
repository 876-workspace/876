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
 * The workspace sidebar navigation — the app's sections rendered inside Console.
 *
 * Renders as a vertical list in the left column on desktop, and a horizontal bar on mobile.
 */
export function WorkspaceNav({ links }: { links: WorkspaceNavLink[] }) {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Workspace sections"
      className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible"
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
              'flex items-center gap-2 rounded-md px-3 py-2 text-[0.8125rem] font-medium whitespace-nowrap transition-colors',
              isActive
                ? 'bg-muted text-foreground/90 font-medium'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground/80'
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
