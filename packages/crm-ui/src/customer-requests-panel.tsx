'use client'

import Link from 'next/link'

import type { CrmRequest } from '@876/crm'
import { Button } from '@876/ui/button'
import { Empty, EmptyContent, EmptyHeader, EmptyTitle } from '@876/ui/empty'
import {
  ListPane,
  ListPaneBody,
  ListPaneEmpty,
  ListPaneHeader,
  ListPaneItem,
} from '@876/ui/list-pane'
import { Skeleton } from '@876/ui/skeleton'

export type CustomerRequestsPanelState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'empty' }
  | { status: 'ready'; requests: readonly CrmRequest[] }

export function CustomerRequestsPanel({
  state,
  requestHref,
  newRequestHref,
  layout = 'pane',
}: {
  state: CustomerRequestsPanelState
  requestHref: (requestId: string) => string
  newRequestHref?: string
  layout?: 'pane' | 'inline'
}) {
  return (
    <section className="space-y-4" aria-label="Customer requests">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Requests</h2>
        {newRequestHref ? (
          <Button size="sm" render={<Link href={newRequestHref} />}>
            New request
          </Button>
        ) : null}
      </div>
      {state.status === 'loading' ? <RequestSkeleton /> : null}
      {state.status === 'error' ? <p role="alert">{state.message}</p> : null}
      {state.status === 'empty' ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No requests for this customer</EmptyTitle>
          </EmptyHeader>
          <EmptyContent />
        </Empty>
      ) : null}
      {state.status === 'ready' ? (
        <RequestRows
          requests={state.requests}
          requestHref={requestHref}
          layout={layout}
        />
      ) : null}
    </section>
  )
}

function RequestRows({
  requests,
  requestHref,
  layout,
}: {
  requests: readonly CrmRequest[]
  requestHref: (requestId: string) => string
  layout: 'pane' | 'inline'
}) {
  if (layout === 'inline')
    return (
      <ul className="divide-y rounded-md border">
        {requests.length === 0 ? (
          <li className="text-muted-foreground px-4 py-8 text-center text-sm">
            No requests for this customer
          </li>
        ) : (
          requests.map((request) => (
            <li key={request.id} className="p-3">
              <Link
                href={requestHref(request.id)}
                aria-label={`Open request ${request.number}: ${request.subject}`}
                className="flex items-center justify-between gap-3"
              >
                <span className="min-w-0 truncate font-medium">
                  #{request.number} {request.subject}
                </span>
                <span className="text-muted-foreground shrink-0 text-xs">
                  {request.status} · {request.priority.name}
                </span>
              </Link>
            </li>
          ))
        )}
      </ul>
    )

  return (
    <ListPane>
      <ListPaneHeader>{requests.length} requests</ListPaneHeader>
      <ListPaneBody>
        {requests.length === 0 ? (
          <ListPaneEmpty>No requests for this customer</ListPaneEmpty>
        ) : (
          requests.map((request) => (
            <ListPaneItem
              key={request.id}
              href={requestHref(request.id)}
              label={`Open request ${request.number}: ${request.subject}`}
              title={`#${request.number} ${request.subject}`}
              subtitle={request.status}
              trailing={request.priority.name}
            />
          ))
        )}
      </ListPaneBody>
    </ListPane>
  )
}

function RequestSkeleton() {
  return <Skeleton className="h-28 w-full" />
}
