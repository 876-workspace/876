'use client'

import type { NavGroupDefinition } from '@876/core/access'
import { cn } from '@876/core/utils'
import { PanelLeftIcon } from '@876/ui/icons'
import { Tooltip, TooltipContent, TooltipTrigger } from '@876/ui/tooltip'
import { useSyncExternalStore, type CSSProperties } from 'react'

import { resolveNavIcon } from './nav-icons'
import { NavLink } from './nav-link'
import { SIDEBAR_SPRING_RAIL } from './sidebar-motion'
import {
  readServerSidebarExpanded,
  readSidebarExpanded,
  subscribeSidebarExpanded,
  writeSidebarExpanded,
} from './sidebar-preferences'

const RAIL_WIDTH = 'w-[3.75rem]'
const PANEL_WIDTH = 'w-56'
const RAIL_COLUMN_WIDTH = 'w-11'
const CARD_MOTION =
  'transition-[width,height] duration-500 [transition-timing-function:var(--876-spring-rail)] motion-reduce:transition-none'

export function Sidebar({ navigation }: { navigation: NavGroupDefinition[] }) {
  const expanded = useSyncExternalStore(
    subscribeSidebarExpanded,
    readSidebarExpanded,
    readServerSidebarExpanded
  )

  return (
    <aside
      aria-label="Projects sections"
      className="hidden shrink-0 flex-col items-center py-4 pl-[var(--876-shell-gutter)] [interpolate-size:allow-keywords] sm:flex"
    >
      <nav
        aria-label="Projects navigation"
        style={{ '--876-spring-rail': SIDEBAR_SPRING_RAIL } as CSSProperties}
        className={cn(
          'border-border/80 bg-background/90 dark:bg-sidebar/90 overflow-hidden rounded-2xl border p-2 shadow-xl ring-1 shadow-black/5 ring-black/[0.04] backdrop-blur-xl [interpolate-size:allow-keywords] dark:shadow-black/25 dark:ring-white/[0.06]',
          CARD_MOTION,
          expanded ? PANEL_WIDTH : RAIL_WIDTH
        )}
      >
        <div
          className={cn(
            'flex flex-col gap-1.5',
            expanded ? 'min-w-0' : RAIL_COLUMN_WIDTH
          )}
        >
          <ExpandControl expanded={expanded} />
          <div className="bg-border/60 my-0.5 h-px w-full" />
          {navigation.map((group, groupIndex) => (
            <div
              key={group.entries[0]?.key ?? groupIndex}
              className={cn(
                'flex flex-col gap-1.5',
                expanded ? 'min-w-0' : 'items-center'
              )}
            >
              {groupIndex > 0 ? (
                <div
                  className={cn(
                    'bg-border/60 my-0.5 h-px',
                    expanded ? 'w-full' : 'w-5'
                  )}
                />
              ) : null}
              {group.entries.map((item) => (
                <NavLink
                  key={item.title}
                  href={item.href}
                  title={item.title}
                  icon={resolveNavIcon(item.icon)}
                  colorClassName={item.colorClassName}
                  expanded={expanded}
                  side="right"
                />
              ))}
            </div>
          ))}
        </div>
      </nav>
    </aside>
  )
}

function ExpandControl({ expanded }: { expanded: boolean }) {
  const label = expanded ? 'Collapse sidebar' : 'Expand sidebar'

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            onClick={() => writeSidebarExpanded(!expanded)}
            aria-label={label}
            aria-expanded={expanded}
            className={cn(
              'text-muted-foreground hover:text-foreground hover:bg-muted/70 focus-visible:ring-sidebar-ring flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:outline-hidden',
              expanded ? 'self-end' : 'self-center'
            )}
          >
            <PanelLeftIcon
              aria-hidden="true"
              strokeWidth={1.6}
              className="size-4"
            />
          </button>
        }
      />
      <TooltipContent side="right" sideOffset={8}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}
