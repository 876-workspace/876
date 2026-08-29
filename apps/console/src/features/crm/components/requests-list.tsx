import Link from 'next/link'

import { CustomerAvatar } from '@876/ui/customer-avatar'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@876/ui/empty'
import { ClipboardDocumentListIcon, User } from '@876/ui/icons'
import { Skeleton } from '@876/ui/skeleton'
import { cn } from '@876/ui/lib/utils'

import { RequestPriorityBadge } from './request-priority-badge'
import { RequestChannelIcon } from './request-source-icon'
import { RequestStatusBadge } from './request-status-badge'
import { formatAge } from '../request-format'
import type { RequestChannel, RequestPriority, RequestStatus } from '../types'

export type RequestListRow = {
  id: string
  number: number
  subject: string
  status: RequestStatus
  priority: RequestPriority
  channel: RequestChannel
  createdAt: number
  updatedAt: number
  customerName: string
  customerIsBusiness: boolean
  assigneeName: string | null
  assigneeAvatar: string | null
  teamName: string | null
}

const OPEN_STATUSES = new Set<RequestStatus>(['OPEN', 'IN_PROGRESS'])

export function RequestsList({
  requests,
  requestsHref,
}: {
  requests: RequestListRow[]
  requestsHref: string
}) {
  return (
    <div className="876-card overflow-hidden">
      <div className="border-border/60 bg-muted/20 flex items-center justify-between gap-4 border-b px-4 py-2.5 sm:px-5">
        <span className="text-muted-foreground text-xs font-medium tabular-nums">
          {requests.length} {requests.length === 1 ? 'request' : 'requests'}
        </span>
      </div>

      {requests.length === 0 ? (
        <Empty className="border-0">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ClipboardDocumentListIcon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>No requests</EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="divide-border/60 divide-y">
          {requests.map((request) => (
            <RequestRow
              key={request.id}
              request={request}
              href={`${requestsHref}/${request.id}`}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function RequestRow({ request, href }: { request: RequestListRow; href: string }) {
  const unresolved = OPEN_STATUSES.has(request.status)

  return (
    <li className="group hover:bg-muted/40 relative transition-colors">
      <span
        aria-hidden="true"
        className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-transparent"
        style={
          request.priority.color
            ? { backgroundColor: request.priority.color }
            : undefined
        }
      />

      <Link
        href={href}
        className="flex items-start gap-3.5 px-4 py-3.5 sm:gap-4 sm:px-5"
      >
        <CustomerAvatar
          name={request.customerName}
          className={cn(
            'mt-0.5 size-9 shrink-0',
            request.customerIsBusiness &&
              'rounded-md after:rounded-md [&_[data-slot=avatar-fallback]]:rounded-md'
          )}
        />

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start gap-2">
            <span className="text-info shrink-0 pt-px font-mono text-xs tabular-nums">
              #{request.number}
            </span>
            <span
              className={cn(
                'group-hover:text-info min-w-0 truncate text-sm transition-colors',
                unresolved ? 'font-semibold' : 'font-medium'
              )}
            >
              {request.subject}
            </span>
          </div>

          <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <span className="text-foreground/70 truncate font-medium">
              {request.customerName}
            </span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1">
              <RequestChannelIcon channel={request.channel} />
              {formatAge(request.createdAt)}
            </span>
            {request.teamName ? (
              <>
                <span aria-hidden="true">·</span>
                <span className="truncate">{request.teamName}</span>
              </>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <div className="flex items-center gap-1.5">
            <RequestStatusBadge status={request.status} />
            {request.priority.isDefault ? null : (
              <RequestPriorityBadge priority={request.priority} />
            )}
          </div>

          <span className="text-muted-foreground inline-flex max-w-[11rem] items-center gap-1.5 text-xs">
            {request.assigneeName ? (
              <>
                <CustomerAvatar
                  name={request.assigneeName}
                  src={request.assigneeAvatar}
                  className="size-4 rounded-[0.25rem] after:rounded-[0.25rem] [&_[data-slot=avatar-fallback]]:rounded-[0.25rem] [&_[data-slot=avatar-fallback]]:text-[0.45rem]"
                />
                <span className="truncate">{request.assigneeName}</span>
              </>
            ) : (
              <>
                <User className="size-3.5" aria-hidden="true" />
                <span>Unassigned</span>
              </>
            )}
          </span>
        </div>
      </Link>
    </li>
  )
}

export function RequestsListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="876-card overflow-hidden">
      <div className="border-border/60 bg-muted/20 flex items-center border-b px-4 py-2.5 sm:px-5">
        <Skeleton className="h-3.5 w-20" />
      </div>
      <ul className="divide-border/60 divide-y">
        {Array.from({ length: rows }, (_, index) => (
          <li key={index} className="flex items-start gap-4 px-5 py-3.5">
            <Skeleton className="size-9 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-3 w-24" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}