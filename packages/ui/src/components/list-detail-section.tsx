'use client'

import * as React from 'react'

import { cn } from '../lib/utils'
import {
  ListDetailShell,
  useListDetailRoute,
  type ListDetailListWidth,
} from './list-detail-shell'
import { Page } from './page'

export type ListDetailSectionProps = {
  /**
   * The section toolbar. It stays mounted whether or not a record is open, so
   * the section keeps its own title and actions beside the open record.
   */
  toolbar?: React.ReactNode
  /** Optional sub-navigation between the toolbar and the list. */
  subnav?: React.ReactNode
  /** The list column: a full table when closed, a `ListPane` when open. */
  list: React.ReactNode
  /** The active route below this layout — the detail column. */
  children: React.ReactNode
  /**
   * Segments that own the whole content area instead of opening beside the
   * list — a create or edit form, typically.
   */
  takeoverSegments?: readonly string[]
  listWidth?: ListDetailListWidth
  /**
   * Height of the section. The default resolves against an `AppShell`, whose
   * main region has a definite height. A host whose main region *scrolls*
   * (Console's organization workspace) must pass a viewport measure instead —
   * `h-full` is a percentage and silently collapses to `auto` there, which
   * drops the list below the card rather than beside it.
   */
  className?: string
}

/**
 * A whole list/detail section, from the page container down.
 *
 * Render it from the section's **layout** so the toolbar and list survive
 * every navigation below it — opening a record, switching tabs, closing
 * again — and so the list column can animate from full width to sidebar
 * instead of two trees swapping places.
 *
 * ```tsx
 * export default function InvoicesLayout({ children }: { children: ReactNode }) {
 *   return (
 *     <ListDetailSection
 *       toolbar={<InvoicesToolbar />}
 *       list={
 *         <Suspense fallback={<InvoiceListSkeleton />}>
 *           <InvoiceListData />
 *         </Suspense>
 *       }
 *       takeoverSegments={['new', 'edit']}
 *     >
 *       {children}
 *     </ListDetailSection>
 *   )
 * }
 * ```
 */
function ListDetailSection({
  toolbar,
  subnav,
  list,
  children,
  takeoverSegments,
  listWidth,
  className,
}: ListDetailSectionProps) {
  const { open, takeover } = useListDetailRoute(takeoverSegments)

  // A takeover route owns the content area, so it must not be wrapped in this
  // section's page measure either.
  if (takeover) return children

  // Open, the page gives up its padding and the shell takes it over: stacked
  // it puts the same rhythm back, and split it runs the panes edge to edge so
  // neither ends in a card border a reader could mistake for the end of the
  // content. Closed, this is an ordinary page with a table on it.
  return (
    <Page className={cn(open ? 'h-full min-h-0 p-0' : 'min-h-full', className)}>
      <ListDetailShell
        open={open}
        toolbar={toolbar}
        subnav={subnav}
        list={list}
        detail={children}
        listWidth={listWidth}
        bleed
      />
    </Page>
  )
}

export { ListDetailSection }
