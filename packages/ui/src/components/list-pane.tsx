'use client'

import * as React from 'react'
import Link from 'next/link'

import { cn } from '../lib/utils'

/**
 * The condensed list that a `ListDetailShell`'s list column collapses into
 * once a record opens beside it.
 *
 * Every section's sidebar list is the same object: a titled card, a scrolling
 * body, and rows that link to a record and mark the open one. Only the row
 * content differs, which is what `ListPaneItem`'s slots are for.
 *
 * ```tsx
 * <ListPane>
 *   <ListPaneHeader>Customers</ListPaneHeader>
 *   <ListPaneBody>
 *     {rows.length === 0 ? (
 *       <ListPaneEmpty>No customers yet</ListPaneEmpty>
 *     ) : (
 *       rows.map((row) => (
 *         <ListPaneItem
 *           key={row.id}
 *           href={`/customers/${row.id}`}
 *           selected={row.id === selectedId}
 *           label={`View customer ${row.name}`}
 *           leading={<CustomerAvatar name={row.name} className="size-7" />}
 *           title={row.name}
 *           subtitle={row.email}
 *           trailing={row.archived ? <Badge>Archived</Badge> : null}
 *         />
 *       ))
 *     )}
 *   </ListPaneBody>
 * </ListPane>
 * ```
 */
function ListPane({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="list-pane"
      className={cn(
        '876-card flex h-full min-h-0 flex-col overflow-hidden',
        className
      )}
      {...props}
    />
  )
}

/** The pane's title bar. Name the collection, not the open record. */
function ListPaneHeader({
  className,
  ...props
}: React.ComponentProps<'header'>) {
  return (
    <header
      data-slot="list-pane-header"
      className={cn(
        '876-header-row shrink-0 border-b px-4 py-3 text-[0.8125rem] font-semibold',
        className
      )}
      {...props}
    />
  )
}

/**
 * The scrolling row region.
 *
 * Deliberately **not** `overscroll-contain` — see the note on
 * `DetailCardBody`. A pane inside the page must let the wheel reach the page
 * once the pane is at its bounds.
 */
function ListPaneBody({ className, ...props }: React.ComponentProps<'ul'>) {
  return (
    <ul
      data-slot="list-pane-body"
      className={cn('876-scroll min-h-0 flex-1 overflow-y-auto', className)}
      {...props}
    />
  )
}

/** Shown in place of rows when the collection is empty. */
function ListPaneEmpty({ className, ...props }: React.ComponentProps<'li'>) {
  return (
    <li
      data-slot="list-pane-empty"
      className={cn(
        'text-muted-foreground px-4 py-8 text-center text-xs',
        className
      )}
      {...props}
    />
  )
}

type ListPaneItemProps = {
  href: string
  /** Marks the record currently open in the detail column. */
  selected?: boolean
  /** Accessible name for the row link — say what opens, e.g. "View invoice 1042". */
  label?: string
  /** Avatar, icon, or status dot. */
  leading?: React.ReactNode
  /** The row subject. One line, truncated. */
  title: React.ReactNode
  /** Supporting line under the title. */
  subtitle?: React.ReactNode
  /** Right-aligned amount, badge, or date. */
  trailing?: React.ReactNode
  className?: string
}

/**
 * One row. The whole row is the link, so a click anywhere in it opens the
 * record and keyboard focus lands on a single target.
 */
function ListPaneItem({
  href,
  selected = false,
  label,
  leading,
  title,
  subtitle,
  trailing,
  className,
}: ListPaneItemProps) {
  return (
    <li data-slot="list-pane-item">
      <Link
        href={href}
        aria-label={label}
        aria-current={selected ? 'true' : undefined}
        data-state={selected ? 'selected' : undefined}
        className={cn(
          'focus-visible:ring-ring flex items-center gap-3 border-b px-4 py-3 transition-colors focus-visible:ring-2 focus-visible:outline-none',
          'border-876-surface-border/60 last:border-b-0',
          selected ? 'bg-muted/70 font-medium' : 'hover:bg-muted/40',
          className
        )}
      >
        {leading ? <span className="shrink-0">{leading}</span> : null}

        <span className="min-w-0 flex-1">
          <span className="text-foreground block truncate text-[0.8125rem] font-medium">
            {title}
          </span>
          {subtitle ? (
            <span className="text-muted-foreground block truncate text-[0.6875rem]">
              {subtitle}
            </span>
          ) : null}
        </span>

        {trailing ? (
          <span className="text-muted-foreground shrink-0 text-[0.6875rem]">
            {trailing}
          </span>
        ) : null}
      </Link>
    </li>
  )
}

export { ListPane, ListPaneHeader, ListPaneBody, ListPaneEmpty, ListPaneItem }
