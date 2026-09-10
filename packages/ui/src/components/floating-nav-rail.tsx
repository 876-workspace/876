'use client'

import * as React from 'react'

import { PanelLeftIcon } from '../icons'
import { cn } from '../lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip'
import { FLOATING_NAV_RAIL_EASING } from './floating-nav-rail-motion'

const RAIL_WIDTH = 'w-[3.75rem]'
const PANEL_WIDTH = 'w-56'
const RAIL_COLUMN_WIDTH = 'w-11'
const CARD_MOTION =
  'transition-[width,height] duration-500 [transition-timing-function:var(--876-floating-nav-rail-spring)] motion-reduce:transition-none'

export type FloatingNavRailProps = Omit<
  React.ComponentProps<'nav'>,
  'children'
> & {
  expanded: boolean
  children: React.ReactNode
  outerClassName?: string
  contentClassName?: string
}

/**
 * Compact, content-sized floating navigation chrome.
 *
 * This is intentionally separate from `Sidebar variant="floating"`, which is
 * the full-height shadcn sidebar treatment. Navigation data, routing, access,
 * and expansion persistence stay with the consuming app.
 */
function FloatingNavRail({
  expanded,
  children,
  outerClassName,
  contentClassName,
  className,
  style,
  ...props
}: FloatingNavRailProps) {
  return (
    <aside
      data-slot="floating-nav-rail-area"
      className={cn(
        'hidden shrink-0 flex-col items-center py-4 pl-[var(--876-shell-gutter)] [interpolate-size:allow-keywords] sm:flex',
        outerClassName
      )}
    >
      <nav
        {...props}
        data-slot="floating-nav-rail"
        data-state={expanded ? 'expanded' : 'collapsed'}
        style={
          {
            ...style,
            '--876-floating-nav-rail-spring': FLOATING_NAV_RAIL_EASING,
          } as React.CSSProperties
        }
        className={cn(
          'border-border/80 bg-background/90 dark:bg-sidebar/90 overflow-hidden rounded-2xl border p-2 shadow-xl ring-1 shadow-black/5 ring-black/[0.04] backdrop-blur-xl [interpolate-size:allow-keywords] dark:shadow-black/25 dark:ring-white/[0.06]',
          CARD_MOTION,
          expanded ? PANEL_WIDTH : RAIL_WIDTH,
          className
        )}
      >
        <div
          data-slot="floating-nav-rail-content"
          className={cn(
            'flex flex-col gap-1.5',
            expanded ? 'min-w-0' : RAIL_COLUMN_WIDTH,
            contentClassName
          )}
        >
          {children}
        </div>
      </nav>
    </aside>
  )
}

export type FloatingNavRailToggleProps = Omit<
  React.ComponentProps<'button'>,
  'children'
> & {
  expanded: boolean
  onExpandedChange: (expanded: boolean) => void
}

/** Presentation-only toggle for consumers that keep rail state themselves. */
function FloatingNavRailToggle({
  expanded,
  onExpandedChange,
  className,
  onClick,
  ...props
}: FloatingNavRailToggleProps) {
  const label = expanded ? 'Collapse sidebar' : 'Expand sidebar'

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            {...props}
            type="button"
            onClick={(event) => {
              onClick?.(event)
              if (!event.defaultPrevented) onExpandedChange(!expanded)
            }}
            aria-label={label}
            aria-expanded={expanded}
            className={cn(
              'text-muted-foreground hover:text-foreground hover:bg-muted/70 focus-visible:ring-sidebar-ring flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:outline-hidden',
              expanded ? 'self-end' : 'self-center',
              className
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

export { FloatingNavRail, FloatingNavRailToggle }
