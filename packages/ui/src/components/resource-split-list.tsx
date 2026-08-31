'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

import { cn } from '../lib/utils'
import { useDetailSegments } from './list-detail-shell'

export type ResourceSplitListItem = {
  id: string
  href: string
  title: string
  description?: string | null
  meta?: string | null
}

type Props = {
  items: ResourceSplitListItem[]
  table: ReactNode
  className?: string
}

function withQuery(href: string, query: string): string {
  if (!query) return href
  return `${href}${href.includes('?') ? '&' : '?'}${query}`
}

/**
 * Keeps the full data table while a resource section is closed, then swaps the
 * table presentation for the same condensed list treatment used by CRM once a
 * record card opens beside it. The underlying route remains the source of truth.
 */
export function ResourceSplitList({ items, table, className }: Props) {
  const segments = useDetailSegments()
  const searchParams = useSearchParams()
  const selectedId = segments[0] ?? null
  const open = selectedId !== null

  if (!open || items.length === 0) return table

  const query = searchParams.toString()

  return (
    <div
      className={cn(
        '876-card h-full min-h-0 overflow-y-auto divide-y',
        className
      )}
    >
      {items.map((item) => {
        const selected = selectedId === item.id
        return (
          <Link
            key={item.id}
            href={withQuery(item.href, query)}
            aria-current={selected ? 'page' : undefined}
            className={cn(
              'block px-4 py-3 transition-colors',
              selected ? 'bg-muted/70' : 'hover:bg-muted/35'
            )}
          >
            <p className="truncate text-sm font-medium">{item.title}</p>
            {item.description ? (
              <p className="text-muted-foreground mt-0.5 truncate text-xs">
                {item.description}
              </p>
            ) : null}
            {item.meta ? (
              <p className="text-muted-foreground mt-1 truncate text-[0.6875rem]">
                {item.meta}
              </p>
            ) : null}
          </Link>
        )
      })}
    </div>
  )
}
