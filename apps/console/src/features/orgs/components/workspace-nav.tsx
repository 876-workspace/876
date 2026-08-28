'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@876/core/utils'

import { Tooltip, TooltipContent, TooltipTrigger } from '@876/ui/tooltip'
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
 * In collapsed mode, renders compact icon-only square tiles.
 */
export function WorkspaceNav({
  links,
  collapsed = false,
}: {
  links: WorkspaceNavLink[]
  collapsed?: boolean
}) {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Workspace sections"
      className={cn(
        'flex gap-1 overflow-x-auto lg:overflow-visible',
        collapsed ? 'lg:flex-col lg:items-center lg:gap-1.5' : 'lg:flex-col'
      )}
    >
      {links.map((link) => {
        const isActive = link.exact
          ? pathname === link.href
          : pathname === link.href || pathname.startsWith(`${link.href}/`)

        if (collapsed) {
          return (
            <Tooltip key={link.href}>
              <TooltipTrigger
                render={
                  <Link
                    href={link.href}
                    aria-label={link.label}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'group relative flex size-8.5 items-center justify-center rounded-xl transition-all duration-150',
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground ring-border/40 font-medium shadow-xs ring-1'
                        : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground'
                    )}
                  >
                    <WorkspaceIcon
                      iconKey={link.iconKey}
                      colored
                      className="size-4 shrink-0 transition-transform duration-150 group-hover:scale-110"
                    />
                  </Link>
                }
              />
              <TooltipContent side="right" sideOffset={8}>
                {link.label}
              </TooltipContent>
            </Tooltip>
          )
        }

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'group flex items-center gap-2.5 rounded-md px-3 py-2 text-[0.8125rem] font-medium whitespace-nowrap transition-colors',
              isActive
                ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-2xs'
                : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground'
            )}
          >
            <WorkspaceIcon
              iconKey={link.iconKey}
              colored
              className="size-4 shrink-0 transition-transform duration-150 group-hover:scale-105"
            />
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}
