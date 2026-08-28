import { formatDateTime } from '@876/core/timestamps'
import { AppError } from '@876/ui/app-error'
import { CategoryIcon } from '@876/ui/category-icons'
import { CustomerAvatar } from '@876/ui/customer-avatar'
import { Building2, Clock, User, Users } from '@876/ui/icons'
import { Skeleton } from '@876/ui/skeleton'
import Link from 'next/link'

import { resolveCustomerIdentity } from '@/features/customers/customer-identity'

import { RequestHeaderActions } from '../../_components/request-header-actions'
import { formatAge } from '../../_lib/request-format'
import {
  loadCategoryIndex,
  loadCustomer,
  loadDirectory,
  loadRequest,
} from '../_data'

export async function RequestToolbar({ requestId }: { requestId: string }) {
  const [requestResult, directory] = await Promise.all([
    loadRequest(requestId),
    loadDirectory(),
  ])

  if (!requestResult.request)
    return (
      <div className="mb-5 space-y-3">
        <h1 className="876-page-title">Request</h1>
        {requestResult.error ? (
          <AppError
            title="Request data is temporarily unavailable"
            error={requestResult.error}
            variant="banner"
          />
        ) : null}
      </div>
    )

  const request = requestResult.request

  return (
    <div className="mb-5 space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
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
            requestId={request.id}
            requestNumber={request.number}
            status={request.status}
            customerId={request.customerId}
            currentUserId={requestResult.context.userId}
            departments={directory.departments}
            members={directory.members}
          />
        </div>
      </div>
      {directory.departmentsError ? (
        <AppError
          title="Team options are temporarily incomplete"
          error={directory.departmentsError}
          variant="inline"
        />
      ) : null}
      {directory.membersError ? (
        <AppError
          title="Member options are temporarily incomplete"
          error={directory.membersError}
          variant="inline"
        />
      ) : null}
    </div>
  )
}

export function RequestToolbarSkeleton() {
  return (
    <div className="mb-5 flex items-start justify-between gap-x-6">
      <Skeleton className="mt-1 h-7 w-72" />
      <Skeleton className="h-9 w-80 shrink-0" />
    </div>
  )
}

export async function RequestIdentity({ requestId }: { requestId: string }) {
  const requestResult = await loadRequest(requestId)
  if (!requestResult.request)
    return requestResult.error ? (
      <AppError
        title="Request details are temporarily unavailable"
        error={requestResult.error}
        variant="inline"
      />
    ) : null

  const request = requestResult.request
  const [directory, customerResult, categoryResult] = await Promise.all([
    loadDirectory(),
    loadCustomer(request.customerId),
    loadCategoryIndex(),
  ])

  const category = request.categoryId
    ? (categoryResult.categories.get(request.categoryId) ?? null)
    : null

  const identity = resolveCustomerIdentity(
    customerResult.customer,
    customerResult.profile?.billingCustomerId ?? request.customerId
  )
  const assignee = request.assigneeId
    ? (directory.members.find((m) => m.userId === request.assigneeId) ?? {
        userId: request.assigneeId,
        name: request.assigneeId,
        email: null,
        avatar: null,
      })
    : null
  const teamName = request.teamId
    ? (directory.departments.find((d) => d.id === request.teamId)?.name ??
      request.teamId)
    : null

  return (
    <div className="space-y-2">
      {customerResult.error ? (
        <AppError
          title="Customer details are temporarily incomplete"
          error={customerResult.error}
          variant="inline"
        />
      ) : null}
      {directory.membersError || directory.departmentsError ? (
        <AppError
          title="Assignment details are temporarily incomplete"
          error={directory.membersError ?? directory.departmentsError!}
          variant="inline"
        />
      ) : null}
      {categoryResult.error ? (
        <AppError
          title="Category details are temporarily incomplete"
          error={categoryResult.error}
          variant="inline"
        />
      ) : null}
      <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[0.8125rem]">
        <Link
          href={`/customers/${request.customerId}`}
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
            <span className="text-foreground/80 hover:text-info inline-flex items-center gap-1 truncate transition-colors">
              <CustomerAvatar
                name={assignee.name}
                src={assignee.avatar}
                className="size-4 rounded-[0.25rem] after:rounded-[0.25rem] [&_[data-slot=avatar-fallback]]:rounded-[0.25rem] [&_[data-slot=avatar-fallback]]:text-[0.45rem]"
              />
              <span>{assignee.name}</span>
            </span>
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
