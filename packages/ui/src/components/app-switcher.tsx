'use client'

import { cn } from '../lib/utils'
import { Squares2X2Icon } from '../icons'
import { buttonVariants } from './button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu'

export type AppSwitcherApp = {
  name: string
  url: string
  description?: string
  initials?: string
  current?: boolean
}

/**
 * Shared presentational app launcher for topbars. The consuming app supplies
 * plain link data; this component renders a compact keyboard-accessible grid
 * and leaves routing and app discovery outside the shared UI package.
 */
export function AppSwitcher({
  apps,
  className,
}: {
  apps: AppSwitcherApp[]
  className?: string
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="App switcher"
        className={cn(
          buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
          'text-muted-foreground hover:text-foreground h-8 w-8 rounded-lg',
          className
        )}
      >
        <Squares2X2Icon
          aria-hidden="true"
          className="size-5 text-muted-foreground dark:text-white/70"
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="grid w-72 grid-cols-3 gap-1 p-2"
      >
        {apps.map((app) => (
          <DropdownMenuItem
            key={`${app.name}:${app.url}`}
            render={
              <a
                href={app.url}
                aria-current={app.current ? 'page' : undefined}
              />
            }
            className={cn(
              'focus:bg-accent flex min-w-0 flex-col justify-start gap-1.5 rounded-lg px-1.5 py-2.5 text-center',
              app.current && 'bg-muted text-foreground ring-border ring-1'
            )}
          >
            <span
              aria-hidden="true"
              className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg text-xs font-semibold tracking-tight"
            >
              {app.initials ?? getInitials(app.name)}
            </span>
            <span className="w-full truncate text-xs font-medium">
              {app.name}
            </span>
            {app.description ? (
              <span className="text-muted-foreground line-clamp-2 w-full text-[0.625rem] leading-tight">
                {app.description}
              </span>
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)

  if (words.length >= 2) return `${words[0][0]}${words[1][0]}`.toUpperCase()

  return name.trim().slice(0, 2).toUpperCase() || '—'
}
