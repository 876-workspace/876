'use client'

import type { NavEntry, NavGroupDefinition } from '@876/core/access'
import { cn } from '@876/core/utils'
import { ArrowLeft } from '@876/ui/icons'
import { Tooltip, TooltipContent, TooltipTrigger } from '@876/ui/tooltip'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

import { NavIcon } from '@/components/shell/nav-icons'
import {
  isActiveConsolePath,
  navLinkActive,
  navLinkActiveFallback,
  navLinkBase,
  navLinkRest,
} from '@/components/shell/nav-link'
import {
  isNavSection,
  navSections,
  resolveActiveChildKey,
  resolveOpenSectionKey,
  type NavSection,
} from '@/components/shell/sidebar-sections'

/**
 * The card resizes in both axes between the two levels: it widens for the
 * panel's labels, and its height follows the row count — today a section holds
 * far fewer rows than the rail has icons, so the shrink is the larger of the
 * two movements.
 *
 * `height` only interpolates from `auto` where `interpolate-size` is supported
 * (set on the column below). Everywhere else the height snaps and the width
 * still animates, which is the behaviour this replaced.
 */
const CARD_MOTION =
  'transition-[width,height] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none'

const RAIL_WIDTH = 'w-[3.75rem]'
const PANEL_WIDTH = 'w-56'

/**
 * How far the card sits from the window edge and from the main region. Both
 * grow with the panel: a rail floating in 4px of gutter reads as deliberate,
 * but the panel is nearly four times as wide and its labels run much closer to
 * the card's edge, so the same 4px reads as the panel touching the content.
 *
 * The page container inside the main region adds its own `px-4`, so the gutter
 * here is the smaller half of the visible gap — 20px at the rail, 24px at the
 * panel. 16px of gutter was tried and overshot; the panel read as detached.
 *
 * Insets move on the card's own curve so the whole assembly resizes as a piece.
 */
const INSET_MOTION =
  'transition-[padding] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none'
const RAIL_INSET = 'pr-1 pl-3'
const PANEL_INSET = 'pr-2 pl-5'

/**
 * The rail column fills the card's content box exactly — the rail width less
 * its `p-2` on both sides — so the icons are centred at rest and still do not
 * drift sideways while the card resizes around them.
 */
const RAIL_COLUMN_WIDTH = 'w-11'

/**
 * Console's drill-down sidebar.
 *
 * Level 0 is the icon rail. An entry that owns a subtree navigates as usual and
 * the rail is replaced by that section's labelled items, sliding in from the
 * right; a back row returns to the rail. Only one level is mounted at a time,
 * so the card's height always matches what is actually showing.
 *
 * The open panel is **derived from the pathname**, not from click state, so a
 * deep link, a refresh, and the browser's back button all land on the right
 * level with nothing to keep in sync. The one piece of state here is the
 * deliberate collapse — pressing back to see the rail without leaving the page.
 */
export function Sidebar({
  navigation,
}: {
  navigation: readonly NavGroupDefinition[]
}) {
  const pathname = usePathname()
  const derivedKey = resolveOpenSectionKey(pathname, navigation)

  // Which section the operator collapsed away from. Held as that section's key
  // rather than a boolean so navigating into a *different* section reopens the
  // panel on its own, with no effect needed to clear the flag.
  const [collapsedKey, setCollapsedKey] = useState<string | null>(null)
  const openKey = collapsedKey === derivedKey ? null : derivedKey

  const section = openKey
    ? (navSections(navigation).find((entry) => entry.key === openKey) ?? null)
    : null

  return (
    <aside
      className={cn(
        'hidden shrink-0 flex-col items-center py-4 [interpolate-size:allow-keywords] md:flex',
        INSET_MOTION,
        section ? PANEL_INSET : RAIL_INSET
      )}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && section) setCollapsedKey(section.key)
      }}
    >
      <nav
        aria-label="Console sections"
        className={cn(
          'border-border/80 bg-background/90 dark:bg-sidebar/90 overflow-hidden rounded-2xl border p-2 shadow-xl ring-1 shadow-black/5 ring-black/[0.04] backdrop-blur-xl dark:shadow-black/25 dark:ring-white/[0.06]',
          CARD_MOTION,
          section ? PANEL_WIDTH : RAIL_WIDTH
        )}
      >
        {section ? (
          <SectionPanel
            key={section.key}
            section={section}
            pathname={pathname}
            onBack={() => setCollapsedKey(section.key)}
          />
        ) : (
          <Rail
            navigation={navigation}
            pathname={pathname}
            onOpenSection={() => setCollapsedKey(null)}
          />
        )}
      </nav>
    </aside>
  )
}

/** Level 0 — the icon rail, grouped exactly as the registry declares. */
function Rail({
  navigation,
  pathname,
  onOpenSection,
}: {
  navigation: readonly NavGroupDefinition[]
  pathname: string
  onOpenSection: () => void
}) {
  return (
    <div
      className={cn(
        'animate-in fade-in-0 flex flex-col items-center gap-1.5 duration-200 motion-reduce:animate-none',
        RAIL_COLUMN_WIDTH
      )}
    >
      {navigation.map((group, groupIndex) => (
        <div key={group.key} className="flex flex-col items-center gap-1.5">
          {groupIndex > 0 && <div className="bg-border/60 my-0.5 h-px w-5" />}
          {group.entries.map((entry) => (
            <RailLink
              key={entry.key}
              entry={entry}
              pathname={pathname}
              onOpenSection={onOpenSection}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

function RailLink({
  entry,
  pathname,
  onOpenSection,
}: {
  entry: NavEntry
  pathname: string
  onOpenSection: () => void
}) {
  const isActive = isActiveConsolePath(pathname, entry.href)
  const drills = isNavSection(entry)

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Link
            href={entry.href}
            aria-label={entry.title}
            aria-current={isActive ? 'page' : undefined}
            // Navigating is what opens the panel. This only clears a previous
            // collapse, so clicking the section you just backed out of brings
            // its panel back instead of doing nothing.
            onClick={drills ? onOpenSection : undefined}
            className={cn(
              navLinkBase,
              isActive
                ? cn(
                    navLinkActive,
                    entry.activeClassName ?? navLinkActiveFallback
                  )
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
          </Link>
        }
      />
      <TooltipContent side="right" sideOffset={8}>
        {entry.title}
      </TooltipContent>
    </Tooltip>
  )
}

/** Level 1 — the open section's labelled items. */
function SectionPanel({
  section,
  pathname,
  onBack,
}: {
  section: NavSection
  pathname: string
  onBack: () => void
}) {
  const activeChildKey = resolveActiveChildKey(pathname, section)

  return (
    <div className="animate-in slide-in-from-right-3 fade-in-0 flex flex-col gap-0.5 duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:animate-none">
      <button
        type="button"
        onClick={onBack}
        aria-label={`Leave ${section.title} and show all sections`}
        className="text-foreground hover:bg-muted/70 focus-visible:ring-sidebar-ring group mb-1 flex items-center gap-2 rounded-lg px-2 py-1.5 text-[0.8125rem] font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-hidden"
      >
        <ArrowLeft
          aria-hidden="true"
          className={cn(
            'size-3.5 shrink-0 transition-transform duration-150 group-hover:-translate-x-0.5',
            section.colorClassName ?? 'text-muted-foreground'
          )}
        />
        {section.title}
      </button>

      <div className="bg-border/60 mb-1 h-px w-full" />

      {section.children.map((child) => {
        const isActive = child.key === activeChildKey

        return (
          <Link
            key={child.key}
            href={child.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'group flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[0.8125rem] whitespace-nowrap transition-colors',
              isActive
                ? cn(
                    'text-sidebar-accent-foreground font-medium shadow-2xs',
                    section.activeClassName ?? 'bg-sidebar-accent'
                  )
                : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground'
            )}
          >
            <NavIcon
              icon={child.icon}
              className={cn(
                'size-4 shrink-0 transition-transform duration-150 group-hover:scale-110',
                // A child carries its section's tint, so the open panel reads
                // as one section rather than a rainbow of unrelated rows.
                child.colorClassName ?? section.colorClassName
              )}
            />
            {child.title}
          </Link>
        )
      })}
    </div>
  )
}
