import Link from 'next/link'

import { Badge } from '@876/ui/badge'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@876/ui/empty'
import { DocumentTextIcon } from '@876/ui/icons'
import { Skeleton } from '@876/ui/skeleton'

export type RequestFormRow = {
  id: string
  name: string
  slug: string
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  version: number
  fieldCount: number
  updatedAt: number
}

const STATUS_VARIANT = {
  PUBLISHED: 'success',
  DRAFT: 'secondary',
  ARCHIVED: 'secondary',
} as const

export function RequestFormsList({
  forms,
  formsHref,
}: {
  forms: readonly RequestFormRow[]
  formsHref?: string | null
}) {
  if (forms.length === 0) {
    return (
      <div className="876-card overflow-hidden">
        <Empty className="border-0">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <DocumentTextIcon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>No intake forms</EmptyTitle>
          </EmptyHeader>
        </Empty>
      </div>
    )
  }

  return (
    <div className="876-card overflow-hidden">
      <ul className="divide-border/60 divide-y">
        {forms.map((form) => {
          const content = (
            <>
              <div className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {form.name}
                </span>
                <span className="text-muted-foreground mt-0.5 block truncate text-xs">
                  /{form.slug} · {form.fieldCount}{' '}
                  {form.fieldCount === 1 ? 'field' : 'fields'} · v{form.version}
                </span>
              </div>
              <Badge variant={STATUS_VARIANT[form.status]}>
                {form.status.charAt(0) + form.status.slice(1).toLowerCase()}
              </Badge>
            </>
          )

          return (
            <li key={form.id} className="hover:bg-muted/40 transition-colors">
              {formsHref ? (
                <Link
                  href={`${formsHref}/${encodeURIComponent(form.id)}`}
                  className="flex items-center gap-4 px-4 py-3.5 sm:px-5"
                >
                  {content}
                </Link>
              ) : (
                <div className="flex items-center gap-4 px-4 py-3.5 sm:px-5">
                  {content}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function RequestFormsListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="876-card overflow-hidden">
      <ul className="divide-border/60 divide-y">
        {Array.from({ length: rows }, (_, index) => (
          <li key={index} className="flex items-center gap-4 px-5 py-3.5">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="h-5 w-20" />
          </li>
        ))}
      </ul>
    </div>
  )
}
