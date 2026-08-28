import Link from 'next/link'

import { CustomerAvatar } from '@876/ui/customer-avatar'
import { Skeleton } from '@876/ui/skeleton'
import { Building2, Clock, User, Users } from '@876/ui/icons'
import { formatDateTime } from '@876/core/timestamps'
import { CategoryIcon } from '@876/ui/category-icons'

import { PlatformOrganizationUnavailable } from './platform-organization-unavailable'
import { RequestHeaderActions } from './request-header-actions'
import { formatAge } from '../request-format'
import { resolveCustomerIdentity } from '../customer-identity'
import {
  loadOrgCategoryIndex,
  loadOrgCustomer,
  loadOrgDirectory,
  loadOrgRequest,
  requestCustomerHref,
  resolveRequestOrgId,
} from '../request-data'

/**
 * The record's title row: the subject on the left, the actions on the right.
 */
export async function RequestToolbar({
  requestId,
  organizationId,
  baseHref = `/support/${requestId}`,
  customerHref,
}: {
  requestId: string
  organizationId?: string
  baseHref?: string
  customerHref?: string
}) {
  const orgId = await resolveRequestOrgId(organizationId)
  if (!orgId) return null

  const { session, request } = await loadOrgRequest(orgId, requestId, baseHref)
  const { departments, members } = await loadOrgDirectory(orgId)

  const resolvedCustomerHref =
    customerHref ?? requestCustomerHref(baseHref, request.customerId)

  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2.5 pt-1">
        <span className="text-info font-mono text-base font-semibold">
          #{request.number}
        </span>
        <h1 className="876-page-title min-w-0 text-balance">
          {request.subject}
        </h1>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-3">
        <RequestHeaderActions
          organizationId={orgId}
          requestId={request.id}
          requestNumber={request.number}
          status={request.status}
          customerId={request.customerId}
          currentUserId={session?.id}
          departments={departments}
          members={members}
          baseHref={baseHref}
          customerHref={resolvedCustomerHref}
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
 * The record's fact line: who the request is for, who owns it, and when it was active.
 */
export async function RequestIdentity({
  requestId,
  organizationId,
  baseHref = `/support/${requestId}`,
  customerHref,
}: {
  requestId: string
  organizationId?: string
  baseHref?: string
  customerHref?: string
}) {
  const orgId = await resolveRequestOrgId(organizationId)
  if (!orgId) return <PlatformOrganizationUnavailable />

  const { request } = await loadOrgRequest(orgId, requestId, baseHref)

  const [{ departments, members }, { customer }, categoriesById] =
    await Promise.all([
      loadOrgDirectory(orgId),
      loadOrgCustomer(orgId, request.customerId),
      loadOrgCategoryIndex(orgId),
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

  const targetCustomerHref =
    customerHref ?? requestCustomerHref(baseHref, request.customerId)

  return (
    <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[0.8125rem]">
      <Link
        href={targetCustomerHref}
        className="text-foreground/85 hover:text-info inline-flex min-w-0 items-center gap-1.5 font-medium transition-colors"
      >
        {identity.isBusiness ? (
          <Building2
            className="text-muted-foreground size-3.5 shrink-0"
            aria-hidden="true"
          />
        ) : (
          <User
            className="text-muted-foreground size-3.5 shrink-0"
            aria-hidden="true"
          />
        )}
        <span className="truncate">{identity.name}</span>
      </Link>

      <div className="flex items-center gap-1.5">
        <span className="text-border" aria-hidden="true">
          ·
        </span>
        <span className="text-muted-foreground/80">Owner</span>
        {assignee ? (
          assignee.userId ? (
            <Link
              href={`/users/${assignee.userId}`}
              className="text-foreground/80 hover:text-info inline-flex items-center gap-1 truncate transition-colors"
            >
              <CustomerAvatar
                name={assignee.name}
                src={assignee.avatar}
                className="size-4 rounded-[0.25rem] after:rounded-[0.25rem] [&_[data-slot=avatar-fallback]]:rounded-[0.25rem] [&_[data-slot=avatar-fallback]]:text-[0.45rem]"
              />
              <span>{assignee.name}</span>
            </Link>
          ) : (
            <span className="text-foreground/80 hover:text-info inline-flex items-center gap-1 truncate transition-colors">
              <CustomerAvatar
                name={assignee.name}
                src={assignee.avatar}
                className="size-4 rounded-[0.25rem] after:rounded-[0.25rem] [&_[data-slot=avatar-fallback]]:rounded-[0.25rem] [&_[data-slot=avatar-fallback]]:text-[0.45rem]"
              />
              <span>{assignee.name}</span>
            </span>
          )
        ) : (
          <span className="text-muted-foreground">Unassigned</span>
        )}
        {teamName ? (
          <>
            <span className="text-border/60" aria-hidden="true">
              /
            </span>
            <span className="text-foreground/80 hover:text-info inline-flex items-center gap-1 truncate transition-colors">
              <Users
                className="text-muted-foreground size-3 shrink-0"
                aria-hidden="true"
              />
              <span>{teamName}</span>
            </span>
          </>
        ) : null}
      </div>

      <div
        className="flex items-center gap-1.5"
        title={formatDateTime(request.updatedAt)}
      >
        <span className="text-border" aria-hidden="true">
          ·
        </span>
        <Clock
          className="text-muted-foreground size-3.5 shrink-0"
          aria-hidden="true"
        />
        <span className="text-muted-foreground truncate">
          Updated {formatAge(request.updatedAt)}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-border" aria-hidden="true">
          ·
        </span>
        <span className="text-muted-foreground/80">Category</span>
        {category ? (
          <span className="text-foreground/80 hover:text-info inline-flex items-center gap-1 truncate font-medium transition-colors">
            <CategoryIcon
              name={category.icon}
              className="size-3.5 shrink-0"
              aria-hidden="true"
            />
            <span>{category.name}</span>
          </span>
        ) : (
          <span className="text-muted-foreground">None</span>
        )}
      </div>
    </div>
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
