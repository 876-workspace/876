import * as React from 'react'
import Link from 'next/link'

import { cn } from '../lib/utils'

export type ListRowProps = {
  href?: string
  onClick?: React.MouseEventHandler<HTMLElement>
  leading?: React.ReactNode
  title: React.ReactNode
  subtitle?: React.ReactNode
  meta?: React.ReactNode
  trailing?: React.ReactNode
  className?: string
}

/** A touch-friendly collection row with one optional whole-row link target. */
function ListRow({
  href,
  onClick,
  leading,
  title,
  subtitle,
  meta,
  trailing,
  className,
}: ListRowProps) {
  const content = (
    <>
      {leading ? (
        <span className="flex size-7 shrink-0 items-center justify-center">
          {leading}
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="text-foreground block truncate text-sm leading-5 font-medium">
          {title}
        </span>
        {subtitle ? (
          <span className="text-muted-foreground block truncate text-xs leading-5">
            {subtitle}
          </span>
        ) : null}
      </span>
      {meta || trailing ? (
        <span className="ml-2 flex shrink-0 flex-col items-end gap-1 text-xs leading-4">
          {meta ? (
            <span className="text-muted-foreground max-w-20 truncate tabular-nums">
              {meta}
            </span>
          ) : null}
          {trailing ? <span>{trailing}</span> : null}
        </span>
      ) : null}
    </>
  )

  const rowClassName = cn(
    'focus-visible:ring-ring flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left transition-colors active:bg-muted/70 focus-visible:ring-2 focus-visible:outline-none',
    href ? 'hover:bg-muted/40' : undefined,
    className
  )

  return (
    <li
      data-slot="list-row"
      data-has-leading={leading ? 'true' : undefined}
      className="relative"
    >
      {href ? (
        <Link href={href} className={rowClassName}>
          {content}
        </Link>
      ) : onClick ? (
        <button type="button" onClick={onClick} className={rowClassName}>
          {content}
        </button>
      ) : (
        <div onClick={onClick} className={rowClassName}>
          {content}
        </div>
      )}
    </li>
  )
}

function ListRowGroup({ className, ...props }: React.ComponentProps<'ul'>) {
  return (
    <ul
      data-slot="list-row-group"
      className={cn(
        '876-card [&>[data-slot=list-row]:not(:last-child)]:after:bg-border overflow-hidden [&>[data-has-leading=true]:not(:last-child)]:after:left-14 [&>[data-slot=list-row]:not(:last-child)]:after:absolute [&>[data-slot=list-row]:not(:last-child)]:after:right-4 [&>[data-slot=list-row]:not(:last-child)]:after:bottom-0 [&>[data-slot=list-row]:not(:last-child)]:after:left-4 [&>[data-slot=list-row]:not(:last-child)]:after:h-px',
        className
      )}
      {...props}
    />
  )
}

export { ListRow, ListRowGroup }
