'use client'

import Link from 'next/link'

import type { CrmRequest } from '@876/crm'
import { Empty, EmptyContent, EmptyHeader, EmptyTitle } from '@876/ui/empty'
import { Skeleton } from '@876/ui/skeleton'

export type RelatedRequestsPanelState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'empty' }
  | { status: 'ready'; requests: readonly CrmRequest[] }

export function RelatedRequestsPanel({
  state,
  requestHref,
}: {
  state: RelatedRequestsPanelState
  requestHref: (requestId: string) => string
}) {
  if (state.status === 'loading') return <Skeleton className="h-24 w-full" />
  if (state.status === 'error') return <p role="alert">{state.message}</p>
  if (state.status === 'empty')
    return (
      <Empty>
        <EmptyHeader><EmptyTitle>No related requests</EmptyTitle></EmptyHeader>
        <EmptyContent>Requests about this record appear here.</EmptyContent>
      </Empty>
    )

  return (
    <section aria-label="Related requests">
      <h2 className="mb-3 text-sm font-semibold">Related requests</h2>
      <ul className="divide-y rounded-md border">
        {state.requests.map((request) => (
          <li key={request.id} className="p-3">
            <Link href={requestHref(request.id)}>
              #{request.number} {request.subject}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
