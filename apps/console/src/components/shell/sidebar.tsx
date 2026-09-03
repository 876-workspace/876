'use client'

import { useState, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react'
import type { NavEntry, NavGroupDefinition } from '@876/core/access'
import { cn } from '@876/core/utils'
import { ArrowLeft, PanelLeftIcon } from '@876/ui/icons'
import { Tooltip, TooltipContent, TooltipTrigger } from '@876/ui/tooltip'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { NavIcon } from '@/components/shell/nav-icons'
import {
  isActiveConsolePath,
  navLinkActive,
  navLinkActiveFallback,
  navLinkBase,
  navLinkRest,
} from '@/components/shell/nav-link'
import { sidebarContextDefinitions } from '@/components/shell/sidebar-context-config'
import {
  isNavSection,
  resolveActiveChildKey,
  resolveSidebarContextStack,
  type SidebarContext,
} from '@/components/shell/sidebar-sections'
import {
  readServerSidebarExpanded,
  readSidebarExpanded,
  subscribeSidebarExpanded,
  writeSidebarExpanded,
} from '@/components/shell/sidebar-preferences'
import { SIDEBAR_SPRING_RAIL } from '@/components/shell/sidebar-motion'
import type { SidebarSlot } from '@/components/shell/sidebar-slots'

const RAIL_WIDTH = 'w-[3.75rem]'
const PANEL_WIDTH = 'w-56'
const RAIL_COLUMN_WIDTH = 'w-11'
const INSET_RAIL = 'pr-1 pl-3'
const INSET_PANEL = 'pr-2 pl-5'
const CARD_MOTION =
  'transition-[width,height] duration-500 [transition-timing-function:var(--876-spring-rail)] motion-reduce:transition-none'
const INSET_MOTION =
  'transition-[padding] duration-500 [transition-timing-function:var(--876-spring-rail)] motion-reduce:transition-none'

const REGION_ORDER = ['top', 'above-nav', 'below-nav', 'footer'] as const

type Props = {
  navigation: readonly NavGroupDefinition[]
  contexts?: readonly SidebarContext[]
  slots?: readonly SidebarSlot[]
}

type DismissedContext = {
  key: string
  pathname: string
}

export function Sidebar({
  navigation,
  contexts = sidebarContextDefinitions,
  slots = [],
}: Props) {
  const pathname = usePathname()
  const stack = resolveSidebarContextStack(pathname, navigation, contexts)
  const [dismissedContext, setDismissedContext] = useState<DismissedContext | null>(
    null
  )
  const expanded = useSyncExternalStore(
    subscribeSidebarExpanded,
    readSidebarExpanded,
    readServerSidebarExpanded
  )

  const derivedIndex = stack.length - 1
  const dismissedIndex =
    dismissedContext?.pathname === pathname
      ? stack.findIndex((item) => item.key === dismissedContext.key)
      : -1
  const visibleIndex =
    dismissedIndex > 0 ? dismissedIndex - 1 : derivedIndex
  const currentContext = stack[visibleIndex] ?? stack[0]!
  const isNested = currentContext.kind !== 'platform'

  return (
    <aside
      className={cn(
        'hidden min-h-0 shrink-0 flex-col items-center justify-center md:flex [interpolate-size:allow-keywords]',
        INSET_MOTION,
        isNested && expanded ? INSET_PANEL : INSET_RAIL
      )}
    >
      <nav
        aria-label="Console navigation"
        style={{ '--876-spring-rail': SIDEBAR_SPRING_RAIL } as CSSProperties}
        className={cn(
          'border-border/80 bg-background/90 dark:bg-sidebar/90 overflow-hidden rounded-2xl border p-2 shadow-xl ring-1 shadow-black/5 ring-black/[0.04] backdrop-blur-xl [interpolate-size:allow-keywords] dark:shadow-black/25 dark:ring-white/[0.06]',
          CARD_MOTION,
          isNested && expanded ? PANEL_WIDTH : RAIL_WIDTH
        )}
      >
        {currentContext.kind === 'platform' ? (
          <PlatformContext
            context={currentContext}
            pathname={pathname}
            expanded={expanded}
            slots={slots}
            onExpandChange={writeSidebarExpanded}
            onOpenContext={() => setDismissedContext(null)}
          />
        ) : (
          <ContextPanel
            context={currentContext}
            pathname={pathname}
            expanded={expanded}
            slots={slots}
            onBack={() => {
              setDismissedContext({ key: currentContext.key, pathname })
            }}
            onExpandChange={writeSidebarExpanded}
          />
        )}
      </nav>
    </aside>
  )
}

function PlatformContext({
  context,
  pathname,
  expanded,
  slots,
  onExpandChange,
  onOpenContext,
}: {
  context: SidebarContext
  pathname: string
  expanded: boolean
  slots: readonly SidebarSlot[]
  onExpandChange: (next: boolean) => void
  onOpenContext: () => void
}) {
  return (
    <div className={cn('flex flex-col gap-1', expanded ? 'min-w-0' : RAIL_COLUMN_WIDTH)}>
      <SidebarExpandControl expanded={expanded} onChange={onExpandChange} />
      <SidebarSlotRegion slots={slots} region="top" expanded={expanded} />
      <SidebarSlotRegion slots={slots} region="above-nav" expanded={expanded} />
      <div className="bg-border/60 my-0.5 h-px w-full" />
      <div className={cn('flex flex-col gap-1', expanded ? 'min-w-0' : 'items-center')}>
        {context.entries.map((entry) => (
          <ContextEntry
            key={entry.key}
            entry={entry}
            pathname={pathname}
            expanded={expanded}
            onOpenContext={isNavSection(entry) ? onOpenContext : undefined}
          />
        ))}
      </div>
      <SidebarSlotRegion slots={slots} region="below-nav" expanded={expanded} />
      <SidebarSlotRegion slots={slots} region="footer" expanded={expanded} />
    </div>
  )
}

function ContextPanel({
  context,
  pathname,
  expanded,
  slots,
  onBack,
  onExpandChange,
}: {
  context: SidebarContext
  pathname: string
  expanded: boolean
  slots: readonly SidebarSlot[]
  onBack: () => void
  onExpandChange: (next: boolean) => void
}) {
  const activeChildKey = resolveActiveChildKey(pathname, context)

  return (
    <div className={cn('animate-in fade-in-0 flex flex-col gap-1 duration-300 motion-reduce:animate-none', expanded ? 'min-w-0' : RAIL_COLUMN_WIDTH)}>
      <div className={cn('flex items-center gap-1', expanded ? 'justify-between' : 'flex-col')}>
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                onClick={onBack}
                aria-label="Back to Console"
                className={cn(
                  'text-foreground hover:bg-muted/70 focus-visible:ring-sidebar-ring group flex items-center rounded-lg focus-visible:ring-2 focus-visible:outline-hidden',
                  expanded
                    ? 'gap-2 px-2 py-1.5 text-[0.8125rem] font-semibold'
                    : 'size-9 justify-center'
                )}
              >
                <ArrowLeft
                  aria-hidden="true"
                  className={cn(
                    'size-3.5 shrink-0 transition-transform duration-150 group-hover:-translate-x-0.5',
                    contextColor(context)
                  )}
                />
                {expanded && context.title}
              </button>
            }
          />
          {!expanded && (
            <TooltipContent side="right" sideOffset={8}>
              Back to Console
            </TooltipContent>
          )}
        </Tooltip>
        <SidebarExpandControl expanded={expanded} onChange={onExpandChange} />
      </div>

      <div className="bg-border/60 mb-1 h-px w-full" />
      <SidebarSlotRegion slots={slots} region="top" expanded={expanded} />
      <SidebarSlotRegion slots={slots} region="above-nav" expanded={expanded} />

      <div className={cn('flex flex-col gap-1', expanded ? 'min-w-0' : 'items-center')}>
        {context.entries.map((entry) => (
          <ContextEntry
            key={entry.key}
            entry={entry}
            pathname={pathname}
            expanded={expanded}
            active={entry.key === activeChildKey}
          />
        ))}
      </div>

      <SidebarSlotRegion slots={slots} region="below-nav" expanded={expanded} />
      <SidebarSlotRegion slots={slots} region="footer" expanded={expanded} />
    </div>
  )
}

function SidebarExpandControl({
  expanded,
  onChange,
}: {
  expanded: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            onClick={() => onChange(!expanded)}
            aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
            aria-expanded={expanded}
            className={cn(
              'text-muted-foreground hover:text-foreground hover:bg-muted/70 focus-visible:ring-sidebar-ring flex items-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:outline-hidden',
              expanded ? 'size-7 justify-center' : 'size-9 justify-center'
            )}
          >
            <PanelLeftIcon
              aria-hidden="true"
              className={cn('size-4 transition-transform duration-200', expanded && 'rotate-180')}
            />
          </button>
        }
      />
      <TooltipContent side="right" sideOffset={8}>
        {expanded ? 'Collapse sidebar' : 'Expand sidebar'}
      </TooltipContent>
    </Tooltip>
  )
}

function ContextEntry({
  entry,
  pathname,
  expanded,
  active = isActiveConsolePath(pathname, entry.href),
  onOpenContext,
}: {
  entry: NavEntry
  pathname: string
  expanded: boolean
  active?: boolean
  onOpenContext?: () => void
}) {
  const drills = isNavSection(entry)

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Link
            href={entry.href}
            aria-label={entry.title}
            aria-current={active ? 'page' : undefined}
            onClick={drills ? onOpenContext : undefined}
            className={cn(
              expanded
                ? 'group flex min-w-0 items-center gap-2.5 rounded-lg px-2 py-1.5 text-[0.8125rem] whitespace-nowrap transition-colors'
                : navLinkBase,
              active
                ? expanded
                  ? cn(
                      'text-sidebar-accent-foreground font-medium shadow-2xs',
                      entry.activeClassName ?? 'bg-sidebar-accent'
                    )
                  : cn(
                      navLinkActive,
                      entry.activeClassName ?? navLinkActiveFallback
                    )
                : expanded
                  ? 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground'
                  : navLinkRest
            )}
          >
            <NavIcon
              icon={entry.icon}
              className={cn(
                'size-4 shrink-0 transition-transform duration-150 group-hover:scale-110',
                entry.colorClassName
              )}
            />
            {expanded && <span className="min-w-0 flex-1 truncate">{entry.title}</span>}
          </Link>
        }
      />
      {!expanded && (
        <TooltipContent side="right" sideOffset={8}>
          {entry.title}
        </TooltipContent>
      )}
    </Tooltip>
  )
}

function contextColor(context: SidebarContext): string {
  return context.entries[0]?.colorClassName ?? 'text-muted-foreground'
}

function SidebarSlotRegion({
  slots,
  region,
  expanded,
}: {
  slots: readonly SidebarSlot[]
  region: (typeof REGION_ORDER)[number]
  expanded: boolean
}) {
  const regionSlots = slots.filter((slot) => slot.region === region)
  if (regionSlots.length === 0) return null

  return (
    <div className={cn('flex flex-col gap-1', expanded ? 'min-w-0' : 'items-center')}>
      {regionSlots.map((slot) => (
        <SidebarSlotView key={slot.key} slot={slot} expanded={expanded} />
      ))}
    </div>
  )
}

function SidebarSlotView({
  slot,
  expanded,
}: {
  slot: SidebarSlot
  expanded: boolean
}) {
  const renderer = SIDEBAR_SLOT_RENDERERS[slot.componentKey]
  if (!renderer) return null

  return renderer(slot, expanded)
}

type SidebarSlotRenderer = (slot: SidebarSlot, expanded: boolean) => ReactNode

/** Component-key registry. Real slots are intentionally empty in Phase 1. */
const SIDEBAR_SLOT_RENDERERS: Record<string, SidebarSlotRenderer> = {}
