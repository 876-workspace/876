'use client'

import type { NavEntry, NavGroupDefinition } from '@876/core/access'
import { cn } from '@876/core/utils'
import { ChevronsLeft } from '@876/ui/icons'
import { Logo } from '@876/ui/logo'
import {
  Sidebar as SidebarRoot,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  useSidebar,
} from '@876/ui/sidebar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@876/ui/tooltip'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, type ReactNode } from 'react'

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
import type {
  SidebarSlot,
  SidebarSlotRegion,
} from '@/components/shell/sidebar-slots'

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
 * Console's contextual navigation rendered inside the standard application
 * sidebar. The route owns which context is open; `SidebarProvider` owns only
 * whether the shared sidebar is expanded or collapsed.
 */
export function Sidebar({
  navigation,
  contexts = navContexts,
  slots = [],
}: Props) {
  const pathname = usePathname()
  const { state } = useSidebar()
  const expanded = state === 'expanded'
  const stack = resolveSidebarContextStack(pathname, navigation, contexts)
  const allContexts = sidebarContexts(navigation, contexts)
  const [dismissed, setDismissed] = useState<DismissedContext | null>(null)

  const derived = stack[stack.length - 1] ?? stack[0]
  const dismissedBack =
    dismissed && dismissed.pathname === pathname
      ? resolveSidebarBackContext(stack, dismissed.key)
      : null
  const context = dismissedBack ?? derived
  if (!context) return null

  const parent = resolveSidebarBackContext(stack, context.key)
  const hasFooterSlots = slots.some((slot) => slot.region === 'footer')

  return (
    <SidebarRoot
      variant="sidebar"
      collapsible="icon"
      renderMobile={false}
      className="bg-sidebar"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && parent)
          setDismissed({ key: context.key, pathname })
      }}
    >
      <SidebarHeader className="border-sidebar-border border-b px-3 pt-3 pb-3 group-data-[collapsible=icon]:px-2">
        <ContextHeader
          context={context}
          parent={parent}
          expanded={expanded}
          onBack={() => setDismissed({ key: context.key, pathname })}
        />
        <SlotRegion slots={slots} region="top" expanded={expanded} />
      </SidebarHeader>

      <SidebarContent className="flex flex-col px-3 py-4 group-data-[collapsible=icon]:px-2">
        <nav
          aria-label="Console navigation"
          className="flex flex-1 flex-col gap-2"
        >
          <SlotRegion slots={slots} region="above-nav" expanded={expanded} />

          <ContextBody
            context={context}
            contexts={allContexts}
            pathname={pathname}
            expanded={expanded}
            onOpenContext={() => setDismissed(null)}
          />

          <SlotRegion slots={slots} region="below-nav" expanded={expanded} />
        </nav>
      </SidebarContent>

      {hasFooterSlots ? (
        <SidebarFooter className="border-sidebar-border border-t px-3 py-3 group-data-[collapsible=icon]:px-2">
          <SlotRegion slots={slots} region="footer" expanded={expanded} />
        </SidebarFooter>
      ) : null}
    </SidebarRoot>
  )
}

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
  if (parent)
    return (
      <BackControl
        context={context}
        parent={parent}
        expanded={expanded}
        onBack={onBack}
      />
    )

  return (
    <Link
      href="/"
      aria-label="Console home"
      className="focus-visible:ring-sidebar-ring flex min-h-9 items-center gap-3 rounded-lg focus-visible:ring-2 focus-visible:outline-hidden group-data-[collapsible=icon]:justify-center"
    >
      <span className="border-sidebar-border flex size-8 shrink-0 items-center justify-center rounded-xl border">
        <Logo className="text-sidebar-foreground text-[0.8125rem] leading-none" />
      </span>
      <span className="text-sidebar-foreground min-w-0 truncate text-[0.9375rem] leading-6 font-semibold tracking-[-0.01em] group-data-[collapsible=icon]:hidden">
        Console
      </span>
    </Link>
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
  const label = `Back to ${parent.backLabel}`

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            onClick={onBack}
            aria-label={label}
            className={cn(
              'text-sidebar-foreground hover:bg-sidebar-accent focus-visible:ring-sidebar-ring group flex min-h-9 min-w-0 items-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:outline-hidden',
              expanded
                ? 'w-full gap-2 px-2 py-1.5 text-[0.8125rem]'
                : 'size-9 justify-center p-0'
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
              <span className="flex min-w-0 flex-1 flex-col text-left">
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
      <TooltipContent side="right" sideOffset={8} hidden={expanded}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

/** The context's groups remain intact so registry dividers remain meaningful. */
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
        <SidebarGroup
          key={group.key}
          className={cn(
            'gap-1 p-0',
            expanded ? 'min-w-0 self-stretch' : 'items-center'
          )}
        >
          {index > 0 ? (
            <div
              className={cn(
                'bg-sidebar-border my-1 h-px',
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
              onOpenContext={
                entryOpensContext(entry, contexts) ? onOpenContext : undefined
              }
            />
          ))}
        </SidebarGroup>
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
      <TooltipContent side="right" sideOffset={8} hidden={expanded}>
        {entry.title}
      </TooltipContent>
    </Tooltip>
  )
}

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
 * Component-key registry for RSC-serializable slot declarations. It remains
 * deliberately empty until Console ships its first non-navigation slot.
 */
const SIDEBAR_SLOT_RENDERERS: Record<string, SidebarSlotRenderer> = {}
