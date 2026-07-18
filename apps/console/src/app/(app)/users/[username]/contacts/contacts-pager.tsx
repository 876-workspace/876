'use client'

import { Button } from '@876/ui/button'
import { ChevronLeftIcon, ChevronRightIcon } from '@876/ui/icons'

type Props = {
  /** Current 1-based page. */
  page: number
  /** Total number of pages (>= 1). */
  pageCount: number
  /** Total number of items across all pages (post-filter). */
  total: number
  /** Page size used to compute the visible range label. */
  pageSize: number
  onPageChange: (page: number) => void
}

/**
 * Page-level pager shared by every contacts view (table/grid/list). It paginates
 * the already-filtered array in `ContactsManager`, so all three views show the
 * same slice — the contacts API returns the full set in one request, so this is
 * client-side slicing, not cursor pagination.
 */
export function ContactsPager({
  page,
  pageCount,
  total,
  pageSize,
  onPageChange,
}: Props) {
  if (pageCount <= 1) return null

  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-muted-foreground text-sm">
        Showing <span className="text-foreground font-medium">{start}</span>–
        <span className="text-foreground font-medium">{end}</span> of{' '}
        <span className="text-foreground font-medium">{total}</span>
      </p>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          <ChevronLeftIcon className="size-4" />
          Previous
        </Button>
        <span className="text-muted-foreground text-sm tabular-nums">
          Page {page} of {pageCount}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
        >
          Next
          <ChevronRightIcon className="size-4" />
        </Button>
      </div>
    </div>
  )
}
