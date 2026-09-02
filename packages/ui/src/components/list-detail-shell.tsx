'use client'

import * as React from 'react'
import { useSelectedLayoutSegments } from 'next/navigation'

import { cn } from '../lib/utils'

/**
 * A Next segment that is part of the URL, as opposed to a route group
 * (`(group)`) or a parallel-route slot (`@slot`), which `useSelectedLayoutSegments`
 * also reports but which never appear in the path.
 */
function isRouteSegment(segment: string): boolean {
  return !segment.startsWith('(') && !segment.startsWith('@')
}

/**
 * The URL segments below the layout this is called from, with route groups and
 * parallel slots removed.
 *
 * A list/detail shell decides whether a record is open from the URL alone, so
 * a `(list)` group wrapping the index page must not read as "a record is
 * open". Every shell derives its state from this hook rather than filtering
 * segments itself, so the rule lives in one place.
 */
export function useDetailSegments(): string[] {
  const segments = useSelectedLayoutSegments()
  return React.useMemo(() => segments.filter(isRouteSegment), [segments])
}

export type ListDetailRoute = {
  /** URL segments below the shell's layout, route groups removed. */
  segments: string[]
  /** The record segment, or `null` on the index route. */
  detailKey: string | null
  /** Whether the detail panel is showing a record. */
  open: boolean
  /** Whether the active route replaces the whole shell (a full-page form). */
  takeover: boolean
}

/**
 * Resolves the shell's state from the URL.
 *
 * `takeoverSegments` names the routes that own the whole content area instead
 * of opening beside the list — a create or edit form, typically. They keep the
 * section's URL prefix so the sidebar stays put, but the list and toolbar
 * stand down.
 */
export function useListDetailRoute(
  takeoverSegments: readonly string[] = []
): ListDetailRoute {
  const segments = useDetailSegments()
  const takeover = segments.some((segment) =>
    takeoverSegments.includes(segment)
  )

  return {
    segments,
    detailKey: takeover ? null : (segments[0] ?? null),
    open: !takeover && segments.length > 0,
    takeover,
  }
}

/** Width of the list column once a record is open. */
export type ListDetailListWidth = 'narrow' | 'wide'

const LIST_WIDTHS: Record<ListDetailListWidth, string> = {
  narrow:
    '@3xl/list-detail:grid-cols-[16rem_minmax(0,1fr)] @6xl/list-detail:grid-cols-[18rem_minmax(0,1fr)]',
  wide: '@3xl/list-detail:grid-cols-[18rem_minmax(0,1fr)] @6xl/list-detail:grid-cols-[20rem_minmax(0,1fr)]',
}

export type ListDetailShellProps = {
  /** Whether a record is open. Resolve it with `useListDetailRoute`. */
  open: boolean
  /**
   * The section toolbar. It stays mounted and fully visible whether or not a
   * record is open — collapsing the list must not take the section's actions
   * with it.
   */
  toolbar?: React.ReactNode
  /** Optional sub-navigation rendered between the toolbar and the list. */
  subnav?: React.ReactNode
  /** The list column: a full-width table when closed, a condensed list when open. */
  list: React.ReactNode
  /** The detail column: whatever route is active below the shell's layout. */
  detail: React.ReactNode
  /** Width of the list column while open. Defaults to `wide`. */
  listWidth?: ListDetailListWidth
  className?: string
}

/**
 * The persistent frame for a list/detail section — a table that narrows into a
 * sidebar list when a record opens beside it.
 *
 * Render it from the section's **layout**, never from a page, so the toolbar
 * and list survive every navigation below it: opening a record, switching
 * tabs, and closing again never remount or refetch the list. That persistence
 * is also what makes the transition possible — the list column is one element
 * whose grid track animates from full width down to sidebar width, rather than
 * two trees swapping places.
 *
 * The breakpoint is a **container** query, not a viewport one. The shell sits
 * inside an app frame with a sidebar and, in some apps, a widget rail, so how
 * much room it actually has is not something the viewport width can answer.
 *
 * ```tsx
 * export default function CustomersLayout({ children }: { children: ReactNode }) {
 *   return <CustomersShell list={<CustomerListData />}>{children}</CustomersShell>
 * }
 * ```
 */
export function ListDetailShell({
  open,
  toolbar,
  subnav,
  list,
  detail,
  listWidth = 'wide',
  className,
}: ListDetailShellProps) {
  return (
    // The container query is measured on this wrapper, and the grid that reads
    // it is the child. An element cannot query its own container, so the two
    // cannot be the same node.
    <div
      data-slot="list-detail-shell"
      data-state={open ? 'open' : 'closed'}
      className={cn('@container/list-detail h-full min-h-0', className)}
    >
      <div
        className={cn(
          '@3xl/list-detail:grid @3xl/list-detail:h-full @3xl/list-detail:min-h-0',
          '@3xl/list-detail:grid-rows-[minmax(0,1fr)]',
          // Animating the track itself is what produces "the table closes in
          // and the card comes out": one grid, two column widths, 300ms
          // between them.
          '@3xl/list-detail:transition-[grid-template-columns,column-gap]',
          '@3xl/list-detail:duration-300 @3xl/list-detail:ease-out',
          open
            ? cn(LIST_WIDTHS[listWidth], '@3xl/list-detail:gap-x-4')
            : '@3xl/list-detail:grid-cols-[minmax(0,1fr)_0fr] @3xl/list-detail:gap-x-0'
        )}
      >
        {/*
         * The complete list side is one grid item. Keeping its toolbar,
         * optional sub-navigation, and list in a flex stack prevents a tall
         * detail card from contributing height to separate list-side rows.
         */}
        <div
          data-slot="list-detail-list-column"
          className="@3xl/list-detail:col-start-1 @3xl/list-detail:row-start-1 @3xl/list-detail:flex @3xl/list-detail:min-h-0 @3xl/list-detail:min-w-0 @3xl/list-detail:flex-col"
        >
          <div className="@3xl/list-detail:shrink-0">{toolbar}</div>

          {subnav ? (
            <div className="@3xl/list-detail:shrink-0">{subnav}</div>
          ) : null}

          {/*
           * Too narrow for the two columns to sit side by side: the record
           * takes the space and the rows stand down, because leaving the whole
           * table stacked above the card means scrolling past it to reach the
           * record that was just opened. The toolbar above stays — it names
           * the section and carries its actions at every width.
           */}
          <div
            className={cn(
              '@3xl/list-detail:min-h-0 @3xl/list-detail:flex-1',
              open && 'hidden @3xl/list-detail:block'
            )}
          >
            {list}
          </div>
        </div>

        {/*
         * Column 2 in the same single row: the card fills the full height of
         * the content area while remaining aligned with the list-side stack.
         * `overflow-hidden` keeps it clipped to the zero-width track while
         * closed, so there is nothing to see until the track opens.
         */}
        <div
          className={cn(
            '@3xl/list-detail:col-start-2 @3xl/list-detail:row-start-1',
            '@3xl/list-detail:min-h-0 @3xl/list-detail:overflow-hidden',
            open
              ? 'mt-4 @3xl/list-detail:mt-0'
              : 'hidden @3xl/list-detail:block'
          )}
        >
          {detail}
        </div>
      </div>
    </div>
  )
}
