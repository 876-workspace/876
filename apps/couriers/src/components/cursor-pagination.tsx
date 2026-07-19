'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { buttonVariants } from '@876/ui/button'

type Props = {
  firstId: string | null
  lastId: string | null
  hasMore: boolean
  count: number
}

export function CursorPagination({ firstId, lastId, hasMore, count }: Props) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const hasBefore = Boolean(
    searchParams.get('after') || searchParams.get('before')
  )

  function buildHref(params: Record<string, string | undefined>): string {
    const next = new URLSearchParams(searchParams.toString())

    for (const [key, value] of Object.entries(params)) {
      if (value === undefined) next.delete(key)
      else next.set(key, value)
    }

    return `${pathname}?${next.toString()}`
  }

  if (!hasBefore && !hasMore) return null

  return (
    <div className="border-876-surface-border flex items-center justify-between border-t px-4 py-3">
      <p className="text-muted-foreground text-xs">{count} records</p>
      <div className="flex gap-2">
        {hasBefore && firstId && (
          <Link
            href={buildHref({ before: firstId, after: undefined })}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            Previous
          </Link>
        )}
        {hasMore && lastId && (
          <Link
            href={buildHref({ after: lastId, before: undefined })}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            Next
          </Link>
        )}
      </div>
    </div>
  )
}
