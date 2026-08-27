import Link from 'next/link'

import { CustomerAvatar } from '@876/ui/customer-avatar'
import { Skeleton } from '@876/ui/skeleton'
import { Calendar, Clock, TagIcon, User, Users } from '@876/ui/icons'
import { formatDate, formatDateTime } from '@876/core/timestamps'

import { RequestHeaderActions } from '../../_components/request-header-actions'
import { RequestPriorityBadge } from '../../_components/request-priority-badge'
import { RequestSourceIcon } from '../../_components/request-source-icon'
import {
  formatAge,
  formatCategory,
  formatSource,
} from '../../_lib/request-format'
import { loadCustomer, loadDirectory, loadRequest } from '../_data'

/**
 * The record's title row: the subject on the left, the actions on the right.
 *
 * They share a row because they are the same line of the page — a title
 * indented a row below its own toolbar reads as belonging to the content
 * underneath rather than to the record. Keeping them together also keeps this
 * row full-width, which is what lets the customer column start immediately
 * beneath it instead of below the whole identity band.
 *
 * Split from the identity band for that reason alone; it shares the band's
 * cached loaders, so the split costs no extra request.
 *
 * There is no back-link — the sidebar already carries Requests, so a second
 * route to the list spent a control on navigation nobody needed from here.
 */
export async function RequestToolbar({ requestId }: { requestId: string }) {
  const { context, request } = await loadRequest(requestId)
  const { departments, members } = await loadDirectory()

  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
      {/* The subject leads; priority reads as a qualifier on it. Status is not
          repeated here — the toolbar's own selector already states it. */}
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2.5 pt-1">
        <span className="text-muted-foreground font-mono text-base font-semibold">
          #{request.number}
        </span>
        <h1 className="876-page-title min-w-0 text-balance">
          {request.subject}
        </h1>
        <RequestPriorityBadge priority={request.priority} />
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-3">
        <RequestHeaderActions
          requestId={request.id}
          requestNumber={request.number}
          status={request.status}
          customerId={request.customerId}
          currentUserId={context.userId}
          departments={departments}
          members={members}
        />
      </div>
    </div>
  )
}

/** Holds the title row's height so the record below it does not jump. */
export function RequestToolbarSkeleton() {
  return (
    <div className="mb-5 flex items-start justify-between gap-x-6">
      <Skeleton className="mt-1 h-7 w-72" />
      <Skeleton className="h-9 w-80 shrink-0" />
    </div>
  )
}

/**
 * The record's fact band: who the request is for, where it came from, who owns
 * it, and how stale it is — the questions asked before any tab is chosen, so
 * it sits above them and does not change when one is. The subject itself lives
 * in the title row above, level with the toolbar.
 */
export async function RequestIdentity({ requestId }: { requestId: string }) {
  const { request } = await loadRequest(requestId)
  const [{ departments, members }, { profile, customer }] = await Promise.all([
    loadDirectory(),
    loadCustomer(request.customerId),
  ])

  const customerName =
    customer?.name ?? profile?.billingCustomerId ?? request.customerId
  const assignee = request.assigneeId
    ? (members.find((m) => m.userId === request.assigneeId) ?? {
        userId: request.assigneeId,
        name: request.assigneeId,
        email: null,
        avatar: null,
      })
    : null
  const teamName = request.teamId
    ? (departments.find((d) => d.id === request.teamId)?.name ?? request.teamId)
    : null

  return (
    <>
      <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
        <Link
          href={`/customers/${request.customerId}`}
          className="text-foreground hover:text-primary inline-flex items-center gap-1.5 font-medium transition-colors hover:underline"
        >
          <User className="size-4 shrink-0" aria-hidden="true" />
          <span>{customerName}</span>
        </Link>
        <span aria-hidden="true" className="text-border">
          ·
        </span>
        <span className="inline-flex items-center gap-1.5">
          <RequestSourceIcon source={request.source} />
          <span>{formatSource(request.source)}</span>
        </span>
        <span aria-hidden="true" className="text-border">
          ·
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Calendar className="size-4 shrink-0" aria-hidden="true" />
          <span>Opened {formatDate(request.createdAt)}</span>
        </span>
      </div>

      {/*
        Ownership, classification and staleness as chips rather than a bordered
        stat card: this row sits directly above a tab strip, and a second boxed
        surface there reads as two competing headers.

        These state facts; they are not a second set of controls. The toolbar's
        Assign menu is where ownership is *changed*, and one chip carries both
        halves of it — a person and the team behind them are one answer to "who
        has this", so splitting them across two chips read as two questions.
      */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Chip label="Owner">
          {assignee ? (
            <>
              <CustomerAvatar
                name={assignee.name}
                src={assignee.avatar}
                className="size-4.5 rounded-[0.25rem] after:rounded-[0.25rem] [&_[data-slot=avatar-fallback]]:rounded-[0.25rem] [&_[data-slot=avatar-fallback]]:text-[0.5rem]"
              />
              <span className="truncate font-medium">{assignee.name}</span>
            </>
          ) : (
            <span className="text-muted-foreground">Unassigned</span>
          )}
          <span aria-hidden="true" className="text-border">
            ·
          </span>
          <Users
            className="text-muted-foreground size-3.5 shrink-0"
            aria-hidden="true"
          />
          {teamName ? (
            <span className="truncate font-medium">{teamName}</span>
          ) : (
            <span className="text-muted-foreground">No team</span>
          )}
        </Chip>

        <Chip label="Category">
          <TagIcon
            className="text-muted-foreground size-3.5"
            aria-hidden="true"
          />
          <span className="truncate font-medium">
            {formatCategory(request.category)}
          </span>
        </Chip>

        <Chip label="Last activity" title={formatDateTime(request.updatedAt)}>
          <Clock
            className="text-muted-foreground size-3.5"
            aria-hidden="true"
          />
          <span className="truncate font-medium">
            {formatAge(request.updatedAt)}
          </span>
        </Chip>
      </div>
    </>
  )
}

/** A labelled fact pill. The label is muted so the value carries the row. */
function Chip({
  label,
  title,
  children,
}: {
  label: string
  title?: string
  children: React.ReactNode
}) {
  return (
    <span
      title={title}
      className="bg-muted/40 flex min-w-0 items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[0.8125rem]"
    >
      <span className="text-muted-foreground shrink-0">{label}</span>
      {children}
    </span>
  )
}

/**
 * Placeholder for the band while it resolves. It matches the real block's
 * height so the tab strip below it does not jump once the record arrives.
 */
export function RequestIdentitySkeleton() {
  return (
    <>
      <Skeleton className="h-5 w-96" />
      <div className="mt-4 flex flex-wrap gap-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-8 w-36" />
      </div>
    </>
  )
}
