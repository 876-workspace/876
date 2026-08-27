import Link from 'next/link'

import { CustomerAvatar } from '@876/ui/customer-avatar'
import { Skeleton } from '@876/ui/skeleton'
import { Clock, TagIcon, User, Users } from '@876/ui/icons'
import { formatDateTime } from '@876/core/timestamps'

import { RequestHeaderActions } from '../../_components/request-header-actions'
import { RequestPriorityBadge } from '../../_components/request-priority-badge'
import { formatAge } from '../../_lib/request-format'
import { CategoryIcon } from '@876/ui/category-icons'

import {
  loadCategoryIndex,
  loadCustomer,
  loadDirectory,
  loadRequest,
} from '../_data'

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
        <span className="text-muted-foreground font-mono text-base">
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
 * The record's fact line: who the request is for, who owns it, what kind it is,
 * and how stale it is — the questions asked before any tab is chosen, so it
 * sits above them and does not change when one is. The subject lives in the
 * title row above, level with the toolbar; the reference data (source, created,
 * id) lives in the aside's Details card and is deliberately not repeated here.
 */
export async function RequestIdentity({ requestId }: { requestId: string }) {
  const { request } = await loadRequest(requestId)
  const [{ departments, members }, { profile, customer }, categoriesById] =
    await Promise.all([
      loadDirectory(),
      loadCustomer(request.customerId),
      loadCategoryIndex(),
    ])

  const category = request.categoryId
    ? (categoriesById.get(request.categoryId) ?? null)
    : null

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
    /*
      One quiet metadata line, not two banded rows.

      What was here before repeated the aside twice over: the source and the
      opened date are both in the Details card a few hundred pixels to the
      right, and the customer's name is the headline of the card above it. A
      header that restates its own sidebar is not denser, only louder — so the
      line keeps the facts that describe the *work* (who has it, what kind it
      is, how stale it is) and the customer link, which is the one duplicate
      worth keeping because the aside drops below the fold on a narrow screen.

      These state facts; they are not controls. The toolbar's Assign menu is
      where ownership changes. One group carries both halves of it — a person
      and the team behind them are one answer to "who has this", so splitting
      them read as two questions.

      No pills, either. A bordered fill sitting directly above the tab strip
      reads as a row of buttons and competes with the three card surfaces
      beside it; a muted label against a plain value separates the pairs
      without adding a fourth surface.
    */
    <div className="text-muted-foreground flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
      <Link
        href={`/customers/${request.customerId}`}
        className="text-foreground hover:text-primary inline-flex min-w-0 items-center gap-1.5 transition-colors hover:underline"
      >
        <User className="size-4 shrink-0" aria-hidden="true" />
        <span className="truncate">{customerName}</span>
      </Link>

      <Fact label="Owner">
        {assignee ? (
          <>
            <CustomerAvatar
              name={assignee.name}
              src={assignee.avatar}
              className="size-4.5 rounded-[0.25rem] after:rounded-[0.25rem] [&_[data-slot=avatar-fallback]]:rounded-[0.25rem] [&_[data-slot=avatar-fallback]]:text-[0.5rem]"
            />
            <span className="text-foreground truncate">{assignee.name}</span>
          </>
        ) : (
          <span>Unassigned</span>
        )}
        <span aria-hidden="true" className="text-border">
          ·
        </span>
        <Users className="size-3.5 shrink-0" aria-hidden="true" />
        {teamName ? (
          <span className="text-foreground truncate">{teamName}</span>
        ) : (
          <span>No team</span>
        )}
      </Fact>

      <Fact label="Category">
        {category ? (
          <>
            <CategoryIcon
              name={category.icon}
              className="size-3.5 shrink-0"
              aria-hidden="true"
            />
            <span className="text-foreground truncate">{category.name}</span>
          </>
        ) : (
          <>
            <TagIcon className="size-3.5 shrink-0" aria-hidden="true" />
            {/* A category is optional at the database level, so "none" is a
                real state rather than missing data. */}
            <span>No category</span>
          </>
        )}
      </Fact>

      <Fact label="Last activity" title={formatDateTime(request.updatedAt)}>
        <Clock className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="text-foreground truncate">
          {formatAge(request.updatedAt)}
        </span>
      </Fact>
    </div>
  )
}

/** A labelled fact: a muted label, then the value in the foreground. */
function Fact({
  label,
  title,
  children,
}: {
  label: string
  title?: string
  children: React.ReactNode
}) {
  return (
    <span title={title} className="flex min-w-0 items-center gap-1.5">
      <span className="shrink-0">{label}</span>
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
    <div className="flex flex-wrap items-center gap-5">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-5 w-48" />
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-5 w-36" />
    </div>
  )
}
