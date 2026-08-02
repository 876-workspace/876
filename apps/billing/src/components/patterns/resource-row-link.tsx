'use client'

import Link from 'next/link'
import { ArrowRightIcon } from '@876/ui/icons'

export function ResourceRowLink({
  href,
  label = 'Open',
  resourceName,
}: {
  href: string
  label?: string
  resourceName: string
}) {
  return (
    <Link
      href={href}
      aria-label={`${label} ${resourceName}`}
      className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-xs font-medium whitespace-nowrap focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
      onClick={(event) => event.stopPropagation()}
    >
      {label}
      <ArrowRightIcon aria-hidden="true" className="size-3.5" />
    </Link>
  )
}
