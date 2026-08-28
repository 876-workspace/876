import * as React from 'react'

import { cn } from '../lib/utils'
import { RouteTabs, type RouteTabItem } from './route-tabs'

export type RecordSplitViewProps = {
  /** Spans the full width above the split — the record's action bar. */
  toolbar?: React.ReactNode
  /** The record's identity band, level with the top of the aside column. */
  header?: React.ReactNode
  /** Section tabs for the main column. Built from the route, never from data. */
  tabs?: RouteTabItem[]
  /** The persistent right-hand column. Sticky on desktop, stacked on mobile. */
  aside?: React.ReactNode
  className?: string
  /** The active section — the only part a tab click replaces. */
  children: React.ReactNode
}

/**
 * The split record view: toolbar, then an identity band and section tabs beside
 * a persistent aside column.
 *
 * This is the shape every 876 record page shares — a CRM request in the product
 * app, the same request opened from a Console organization workspace, and the
 * platform support desk. It is deliberately domain-agnostic: every region is a
 * slot, so the layout can be changed in one place and land on all of them, while
 * each surface keeps its own data loading and auth tier.
 *
 * The outer container is the caller's, so a page-level surface can wrap it in
 * `Page` while a surface already inside a padded shell passes a width class.
 */
export function RecordSplitView({
  toolbar,
  header,
  tabs,
  aside,
  className,
  children,
}: RecordSplitViewProps) {
  return (
    <div data-slot="record-split-view" className={cn('space-y-4', className)}>
      {toolbar}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          {header ? <header className="mb-5">{header}</header> : null}

          {tabs && tabs.length > 0 ? (
            <RouteTabs tabs={tabs} className="876-detail-header-tabs mb-5" />
          ) : null}

          {children}
        </div>

        {aside ? (
          <aside className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-6">
            {aside}
          </aside>
        ) : null}
      </div>
    </div>
  )
}
