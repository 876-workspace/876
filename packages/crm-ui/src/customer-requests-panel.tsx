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
}: {
  state: CustomerRequestsPanelState
  requestHref: (requestId: string) => string
  newRequestHref?: string
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
          <EmptyContent>
            Create a request to start tracking customer work.
          </EmptyContent>
        </Empty>
      ) : null}
      {state.status === 'ready' ? (
        <RequestRows requests={state.requests} requestHref={requestHref} />
      ) : null}
    </section>
  )
}

function RequestRows({
  requests,
  requestHref,
}: {
  requests: readonly CrmRequest[]
  requestHref: (requestId: string) => string
}) {
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
