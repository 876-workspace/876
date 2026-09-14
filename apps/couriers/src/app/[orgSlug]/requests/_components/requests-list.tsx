'use client'

import type { ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'

import type { RequestListRow } from '@876/crm-ui/request-list'
import { RequestsList as SharedRequestsList } from '@876/crm-ui/request-list'
import { AppError } from '@876/ui/app-error'
import { Badge } from '@876/ui/badge'
import {
  ListPane,
  ListPaneBody,
  ListPaneEmpty,
  ListPaneItem,
} from '@876/ui/list-pane'
import { useDetailSegments } from '@876/ui/list-detail-shell'
import { isRequestStatus } from '@876/crm-ui/request-status'
import type { AppErrorValue } from '@876/ui/app-error'

export function RequestsList({
  orgSlug,
  requests,
  error,
}: {
  orgSlug: string
  requests: readonly RequestListRow[]
  error: AppErrorValue | null
}) {
  const segments = useDetailSegments()
  const searchParams = useSearchParams()
  const status = searchParams.get('status') ?? undefined
  const query = searchParams.toString()
  const visible = isRequestStatus(status)
    ? requests.filter((request) => request.status === status)
    : requests
  const baseHref = `/${orgSlug}/requests`

  const content: ReactNode =
    segments.length === 0 ? (
      <SharedRequestsList requests={visible} requestsHref={baseHref} />
    ) : (
      <ListPane>
        <ListPaneBody>
          {visible.length === 0 ? (
            <ListPaneEmpty>No requests</ListPaneEmpty>
          ) : (
            visible.map((request) => (
              <ListPaneItem
                key={request.id}
                href={`${baseHref}/${encodeURIComponent(request.id)}${query ? `?${query}` : ''}`}
                selected={request.id === segments[0]}
                label={`Open request ${request.number}: ${request.subject}`}
                title={`#${request.number} ${request.subject}`}
                subtitle={request.customerName}
                trailing={<Badge variant="secondary">{request.status}</Badge>}
              />
            ))
          )}
        </ListPaneBody>
      </ListPane>
    )

  return (
    <div className="space-y-3">
      {error ? (
        <AppError
          title="Some request data could not be loaded"
          error={error}
          variant="banner"
        />
      ) : null}
      {content}
    </div>
  )
}
