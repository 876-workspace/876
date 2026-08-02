import type { ReactNode } from 'react'
import Link from 'next/link'

import { ChevronRightIcon } from '@876/ui/icons'

type DetailAction = {
  href: string
  label: string
  description: string
  meta?: ReactNode
}

export function DetailActionList({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions: DetailAction[]
}) {
  return (
    <section className="876-card overflow-hidden">
      <div className="border-876-surface-border border-b px-5 py-4">
        <h2 className="876-section-title text-balance">{title}</h2>
        {description ? (
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm text-pretty">
            {description}
          </p>
        ) : null}
      </div>
      <div className="divide-876-surface-border divide-y">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:ring-ring flex items-center gap-4 px-5 py-3.5 focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{action.label}</span>
              <span className="text-muted-foreground mt-0.5 block text-xs text-pretty">
                {action.description}
              </span>
            </span>
            {action.meta !== undefined ? (
              <span className="text-muted-foreground shrink-0 text-sm tabular-nums">
                {action.meta}
              </span>
            ) : null}
            <ChevronRightIcon
              aria-hidden="true"
              className="text-muted-foreground size-4 shrink-0"
            />
          </Link>
        ))}
      </div>
    </section>
  )
}
