'use client'

import type { NavEntry, NavGroupDefinition } from '@876/core/access'
import { cn } from '@876/core/utils'
import { ChevronsLeft, PanelLeftIcon } from '@876/ui/icons'
import { Tooltip, TooltipContent, TooltipTrigger } from '@876/ui/tooltip'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from 'react'

import { navContexts } from '@/components/shell/nav-contexts'
import { NavIcon, resolveNavIconColor } from '@/components/shell/nav-icons'
import {
  isActiveConsolePath,
  navLinkActive,
  navLinkActiveFallback,
  navLinkBase,
  navLinkRest,
} from '@/components/shell/nav-link'
import {
  entryOpensContext,
  resolveActiveEntryKey,
  resolveSidebarBackContext,
  resolveSidebarContextStack,
  sidebarContexts,
  type SidebarContext,
  type SidebarContextDefinition,
} from '@/components/shell/sidebar-context'
import { SIDEBAR_SPRING_RAIL } from '@/components/shell/sidebar-motion'
import {
  readServerSidebarExpanded,
  readSidebarExpanded,
  subscribeSidebarExpanded,
  writeSidebarExpanded,
} from '@/components/shell/sidebar-preferences'
import type {
  SidebarSlot,
  SidebarSlotRegion,
} from '@/components/shell/sidebar-slots'

const RAIL_WIDTH = 'w-[3.75rem]'
const PANEL_WIDTH = 'w-56'

/**
 * The rail column fills the card's content box exactly — the rail width less
 * its `p-2` on both sides — so the icons are centred at rest and do not drift
 * sideways while the card resizes around them.
 */
const RAIL_COLUMN_WIDTH = 'w-11'

/**
 * The in-flow sidebar owns the window inset only. Page owns the adjacent
 * content gutter, so the card has no right inset to compound with it.
 */
const RAIL_INSET = 'pl-[var(--876-shell-gutter)]'
const PANEL_INSET = 'pl-[var(--876-shell-gutter)]'

/**
 * The card resizes in both axes: it widens when expanded, and its height
 * follows the row count, which changes every time the context does.
 *
 * `height` only interpolates from `auto` where `interpolate-size` is supported
 * (set on the column and the card below). Everywhere else the height snaps and
 * the width still animates.
 *
 * The duration must stay equal to the spring's settle time in
 * `sidebar-motion.ts` — the generated `linear()` stops describe that whole
 * window, so a shorter transition truncates the settle and a longer one
 * stretches the overshoot.
 */
const CARD_MOTION =
  'transition-[width,height] duration-500 [transition-timing-function:var(--876-spring-rail)] motion-reduce:transition-none'
const INSET_MOTION =
  'transition-[padding] duration-500 [transition-timing-function:var(--876-spring-rail)] motion-reduce:transition-none'

type Props = {
  navigation: readonly NavGroupDefinition[]
  contexts?: readonly SidebarContextDefinition[]
  slots?: readonly SidebarSlot[]
}

/** Which context the operator backed out of, and from where. */
type DismissedContext = {
  key: string
  pathname: string
}

/**
 * Console's contextual sidebar.
 *
 * The rail is a **stack of navigation contexts**: the platform root, then a
 * section, a product, or an organization's workspace. Exactly one level is
 * mounted at a time, so the card's height always matches what is showing, and
 * entering a context swaps the rail's contents rather than widening it — labels
 * arrive only when the operator asks for them.
 *
 * The open context is derived from the pathname (see `sidebar-context.ts`). The
 * only local state is the deliberate back-out, held as the dismissed context's
 * key **and** the path it was dismissed from, so navigating anywhere reinstates
 * the derived level with no effect needed to clear the flag.
 */
export function Sidebar({
  navigation,
  contexts = navContexts,
  slots = [],
}: Props) {
  const pathname = usePathname()
  const stack = resolveSidebarContextStack(pathname, navigation, contexts)
  const allContexts = sidebarContexts(navigation, contexts)
  const [dismissed, setDismissed] = useState<DismissedContext | null>(null)

  const expanded = useSyncExternalStore(
    subscribeSidebarExpanded,
    readSidebarExpanded,
    readServerSidebarExpanded
  )

  const derived = stack[stack.length - 1] ?? stack[0]
  const dismissedBack =
    dismissed && dismissed.pathname === pathname
      ? resolveSidebarBackContext(stack, dismissed.key)
      : null
  const context = dismissedBack ?? derived
  if (!context) return null

  const parent = resolveSidebarBackContext(stack, context.key)

  return (
    <aside
      className={cn(
        'hidden min-h-0 shrink-0 flex-col items-center justify-center py-4 [interpolate-size:allow-keywords] md:flex',
        INSET_MOTION,
        expanded ? PANEL_INSET : RAIL_INSET
      )}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && parent)
          setDismissed({ key: context.key, pathname })
      }}
    >
      <nav
        aria-label="Console navigation"
        style={{ '--876-spring-rail': SIDEBAR_SPRING_RAIL } as CSSProperties}
        className={cn(
          'border-border/80 bg-background/90 dark:bg-sidebar/90 overflow-hidden rounded-2xl border p-2 shadow-xl ring-1 shadow-black/5 ring-black/[0.04] backdrop-blur-xl [interpolate-size:allow-keywords] dark:shadow-black/25 dark:ring-white/[0.06]',
          CARD_MOTION,
          expanded ? PANEL_WIDTH : RAIL_WIDTH
        )}
      >
        <div
          // Keyed by context so entering one replays the entrance rather than
          // cross-fading two levels that share nothing.
          key={context.key}
          className={cn(
            'animate-in fade-in-0 flex flex-col gap-1 duration-200 motion-reduce:animate-none',
            expanded ? 'min-w-0' : RAIL_COLUMN_WIDTH
          )}
        >
          <ContextHeader
            context={context}
            parent={parent}
            expanded={expanded}
            onBack={() => setDismissed({ key: context.key, pathname })}
          />

          <SlotRegion slots={slots} region="top" expanded={expanded} />
          <SlotRegion slots={slots} region="above-nav" expanded={expanded} />

          <ContextBody
            context={context}
            contexts={allContexts}
            pathname={pathname}
            expanded={expanded}
            onOpenContext={() => setDismissed(null)}
          />

          <SlotRegion slots={slots} region="below-nav" expanded={expanded} />
          <SlotRegion slots={slots} region="footer" expanded={expanded} />
        </div>
      </nav>
    </aside>
  )
}

/**
 * The back control and the expand control — deliberately two affordances.
 *
 * Back pops one level of the stack; expand reveals labels at whatever level is
 * open. Folding them into one button was the first thing tried and it makes
 * neither action discoverable.
 */
function ContextHeader({
  context,
  parent,
  expanded,
  onBack,
}: {
  context: SidebarContext
  parent: SidebarContext | null
  expanded: boolean
  onBack: () => void
}) {
  return (
    <>
      <div
        className={cn(
          'flex items-center gap-1',
          expanded ? 'justify-between' : 'flex-col'
        )}
      >
        {parent ? (
          <BackControl
            context={context}
            parent={parent}
            expanded={expanded}
            onBack={onBack}
          />
        ) : null}
        <ExpandControl expanded={expanded} />
      </div>
      <div className="bg-border/60 my-0.5 h-px w-full" />
    </>
  )
}

function BackControl({
  context,
  parent,
  expanded,
  onBack,
}: {
  context: SidebarContext
  parent: SidebarContext
  expanded: boolean
  onBack: () => void
}) {
  // Names the level actually returned to, which is not always the root once
  // a workspace sits beneath a product.
  const label = `Back to ${parent.title}`

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            onClick={onBack}
            aria-label={label}
            className={cn(
              'text-foreground hover:bg-muted/70 focus-visible:ring-sidebar-ring group flex min-w-0 items-center rounded-lg focus-visible:ring-2 focus-visible:outline-hidden',
              expanded
                ? 'gap-2 px-2 py-1.5 text-[0.8125rem]'
                : 'size-9 justify-center'
            )}
          >
            <ChevronsLeft
              aria-hidden="true"
              className={cn(
                'size-3.5 shrink-0 transition-transform duration-150 group-hover:-translate-x-0.5',
                context.colorClassName ?? 'text-muted-foreground'
              )}
            />
            {expanded ? (
              <span className="flex min-w-0 flex-col text-left">
                <span className="min-w-0 truncate">{context.title}</span>
                {context.subtitle ? (
                  <span className="text-muted-foreground min-w-0 truncate text-[0.6875rem] leading-tight font-normal">
                    {context.subtitle}
                  </span>
                ) : null}
              </span>
            ) : null}
          </button>
        }
      />
      <TooltipContent side="right" sideOffset={8}>
        {label}
      </TooltipContent>
    </Tooltip>
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
            className="text-muted-foreground hover:text-foreground hover:bg-muted/70 focus-visible:ring-sidebar-ring flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:outline-hidden"
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

/**
 * The context's own entries, grouped exactly as its registry declares.
 *
 * Keeping the groups is what preserves the platform rail's dividers; a context
 * that declares one group simply renders none.
 */
function ContextBody({
  context,
  contexts,
  pathname,
  expanded,
  onOpenContext,
}: {
  context: SidebarContext
  contexts: readonly SidebarContext[]
  pathname: string
  expanded: boolean
  onOpenContext: () => void
}) {
  const activeKey = resolveActiveEntryKey(pathname, context)

  return (
    <div
      className={cn(
        'flex flex-col gap-1',
        expanded ? 'min-w-0' : 'items-center'
      )}
    >
      {context.groups.map((group, index) => (
        <div
          key={group.key}
          className={cn(
            'flex flex-col gap-1',
            expanded ? 'min-w-0 self-stretch' : 'items-center'
          )}
        >
          {index > 0 ? (
            <div
              className={cn(
                'bg-border/60 my-0.5 h-px',
                expanded ? 'w-full' : 'w-5 self-center'
              )}
            />
          ) : null}
          {group.entries.map((entry) => (
            <ContextEntry
              key={entry.key}
              entry={entry}
              expanded={expanded}
              active={
                activeKey === null
                  ? isActiveConsolePath(pathname, entry.href)
                  : entry.key === activeKey
              }
              // Navigating is what opens a context. This only clears a previous
              // back-out, so following the entry you just left brings its
              // context back instead of doing nothing.
              onOpenContext={
                entryOpensContext(entry, contexts) ? onOpenContext : undefined
              }
            />
          ))}
        </div>
      ))}
    </div>
  )
}

function ContextEntry({
  entry,
  expanded,
  active,
  onOpenContext,
}: {
  entry: NavEntry
  expanded: boolean
  active: boolean
  onOpenContext?: () => void
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Link
            href={entry.href}
            aria-label={entry.title}
            aria-current={active ? 'page' : undefined}
            onClick={onOpenContext}
            className={cn(
              expanded
                ? 'group flex h-8.5 min-w-0 items-center gap-2.5 rounded-lg px-2 text-[0.8125rem] whitespace-nowrap transition-colors'
                : navLinkBase,
              active
                ? expanded
                  ? cn(
                      'text-sidebar-accent-foreground shadow-2xs',
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
                entry.colorClassName ?? resolveNavIconColor(entry.icon)
              )}
            />
            {expanded ? (
              <span className="min-w-0 flex-1 truncate">{entry.title}</span>
            ) : null}
          </Link>
        }
      />
      {expanded ? null : (
        <TooltipContent side="right" sideOffset={8}>
          {entry.title}
        </TooltipContent>
      )}
    </Tooltip>
  )
}

/**
 * A declared region of the rail that is not navigation — a card, a standalone
 * button, an announcement, a live indicator.
 *
 * The mechanism ships with no slots declared (`sidebar-slots.ts`), so every
 * region renders nothing today. What it fixes in advance is the shape: a slot
 * has a collapsed form as well as an expanded one, because the rail is
 * collapsed by default at every level.
 */
function SlotRegion({
  slots,
  region,
  expanded,
}: {
  slots: readonly SidebarSlot[]
  region: SidebarSlotRegion
  expanded: boolean
}) {
  const regionSlots = slots.filter((slot) => slot.region === region)
  if (regionSlots.length === 0) return null

  return (
    <div
      className={cn(
        'flex flex-col gap-1',
        expanded ? 'min-w-0' : 'items-center'
      )}
    >
      {regionSlots.map((slot) => {
        const render = SIDEBAR_SLOT_RENDERERS[slot.componentKey]
        return render ? (
          <div key={slot.key}>{render(slot, expanded)}</div>
        ) : null
      })}
    </div>
  )
}

type SidebarSlotRenderer = (slot: SidebarSlot, expanded: boolean) => ReactNode

/**
 * Component-key registry for slots, resolved on the client exactly as icon keys
 * are, so the declarations themselves stay RSC-serializable plain data.
 *
 * Deliberately empty: Phase 1 ships the mechanism, not the first card.
 */
const SIDEBAR_SLOT_RENDERERS: Record<string, SidebarSlotRenderer> = {}
