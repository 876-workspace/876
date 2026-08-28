import Link from 'next/link'
import { notFound } from 'next/navigation'

import { CustomerAvatar } from '@876/ui/customer-avatar'
import { Skeleton } from '@876/ui/skeleton'
import { Building2, Clock, TagIcon, User, Users } from '@876/ui/icons'
import { formatDateTime } from '@876/core/timestamps'
import { CategoryIcon } from '@876/ui/category-icons'

import { PlatformOrganizationUnavailable } from './platform-organization-unavailable'
import { RequestHeaderActions } from './request-header-actions'
import { RequestPriorityBadge } from './request-priority-badge'
import { formatAge } from '../request-format'
import { resolveCustomerIdentity } from '../customer-identity'
import {
  loadCategoryIndex,
  loadCustomer,
  loadDirectory,
  loadRequest,
} from '../request-data'

/**
 * The record's title row: the subject on the left, the actions on the right.
 */
export async function RequestToolbar({ requestId }: { requestId: string }) {
  const { org, session, request } = await loadRequest(requestId)
  if (!org || !request) return null
  const { departments, members } = await loadDirectory()

  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
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
          organizationId={org.id}
          requestId={request.id}
          requestNumber={request.number}
          status={request.status}
          customerId={request.customerId}
          currentUserId={session.id}
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
 * and how stale it is — the questions asked before any tab is chosen.
 */
export async function RequestIdentity({ requestId }: { requestId: string }) {
  const { org, request } = await loadRequest(requestId)
  if (!org) return <PlatformOrganizationUnavailable />
  if (!request) notFound()

  const [{ departments, members }, { customer }, categoriesById] =
    await Promise.all([
      loadDirectory(),
      loadCustomer(request.customerId),
      loadCategoryIndex(),
    ])

  const category = request.categoryId
    ? (categoriesById.get(request.categoryId) ?? null)
    : null

  const identity = resolveCustomerIdentity(customer, request.customerId)
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
    <div className="text-muted-foreground flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
      <Link
        href={`/customers/${request.customerId}`}
        className="text-foreground hover:text-primary inline-flex min-w-0 items-center gap-1.5 transition-colors hover:underline"
      >
        {identity.isBusiness ? (
          <Building2 className="size-4 shrink-0" aria-hidden="true" />
        ) : (
          <User className="size-4 shrink-0" aria-hidden="true" />
        )}
        <span className="truncate">{identity.name}</span>
      </Link>

      {identity.isBusiness && identity.contact ? (
        <Fact label="Contact">
          <User className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="text-foreground truncate">
            {identity.contact.name}
          </span>
        </Fact>
      ) : null}

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
