import { AppError } from '@876/ui/app-error'
import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import {
  StatusFilterHeading,
  type StatusFilterOption,
} from '@876/ui/status-filter-heading'
import { Suspense } from 'react'

import { resolveCustomerIdentity } from '@/features/customers/customer-identity'
import { get876Client } from '@/lib/876'
import { requireCrmContext } from '@/lib/auth/require-crm-context'
import type { RequestStatus } from '@/types/crm'

import {
  RequestsFilterBar,
  type FilterDepartment,
  type FilterMember,
} from './_components/requests-filter-bar'
import {
  RequestsList,
  RequestsListSkeleton,
  type RequestListRow,
} from './_components/requests-list'

export const metadata = { title: 'Requests' }

const REQUEST_STATUSES: RequestStatus[] = [
  'OPEN',
  'IN_PROGRESS',
  'WAITING',
  'RESOLVED',
  'CLOSED',
  'CANCELLED',
]

function isRequestStatus(value: string | undefined): value is RequestStatus {
  return (
    typeof value === 'string' &&
    REQUEST_STATUSES.includes(value as RequestStatus)
  )
}

const REQUEST_STATUS_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All requests' },
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'WAITING', label: 'Waiting' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

type Props = {
  searchParams: Promise<{
    status?: string
    team?: string
    assignee?: string
  }>
}

export default async function RequestsPage({ searchParams }: Props) {
  const { status, team, assignee } = await searchParams
  const selectedStatus =
    status === 'all' || !isRequestStatus(status) ? 'all' : status
  const selectedTeam = team && team !== 'all' ? team : 'all'
  const selectedAssignee = assignee && assignee !== 'all' ? assignee : 'all'

  return (
    <Page>
      <ResourceToolbar
        title="Requests"
        titleFilter={
          <StatusFilterHeading
            label="Requests"
            value={selectedStatus}
            options={REQUEST_STATUS_OPTIONS}
          />
        }
        primaryLabel="Add"
        primaryHref="/requests/new"
        primaryVariant="info"
        refresh
      />

      <Suspense fallback={<RequestsListSkeleton />}>
        <RequestsListData
          status={
            selectedStatus === 'all'
              ? undefined
              : (selectedStatus as RequestStatus)
          }
          team={selectedTeam}
          assignee={selectedAssignee}
        />
      </Suspense>
    </Page>
  )
}

/** Renders a client error as text, so it survives the console unchanged. */
function describeError(error: unknown): string {
  if (error && typeof error === 'object') {
    const { code, message } = error as { code?: unknown; message?: unknown }
    if (code || message) return `${code ?? 'unknown'} — ${message ?? ''}`.trim()
  }
  return JSON.stringify(error) ?? String(error)
}

async function RequestsListData({
  status,
  team,
  assignee,
}: {
  status?: RequestStatus
  team: string
  assignee: string
}) {
  const context = await requireCrmContext()
  const $876 = await get876Client()

  let teamId: string | undefined = undefined
  if (team === 'none') teamId = 'unassigned'
  else if (team !== 'all') teamId = team

  let assigneeId: string | undefined = undefined
  if (assignee === 'me') assigneeId = context.userId
  else if (assignee === 'unassigned') assigneeId = 'unassigned'
  else if (assignee !== 'all') assigneeId = assignee

  const [requestsResult, customersResult, departmentsResult, membersResult] =
    await Promise.all([
      $876.requests.list(context.orgId, { status, teamId, assigneeId }),
      $876.customerProfiles.list(context.orgId),
      $876.departments.list(context.orgId),
      $876.organizationMembers.list(context.orgId),
    ])

  if (requestsResult.error)
    return (
      <AppError
        title="Requests couldn't be loaded"
        error={requestsResult.error}
        variant="page"
      />
    )

  if (customersResult.error)
    return (
      <AppError
        title="Customer information couldn't be loaded"
        error={customersResult.error}
        variant="page"
      />
    )

  // Directory data only enriches the queue. Keep the requests usable and show
  // the registered failure instead of hiding it behind a console-only log.
  if (departmentsResult.error)
    console.error(
      `[crm/requests] team directory unavailable: ${describeError(departmentsResult.error)}`
    )
  if (membersResult.error)
    console.error(
      `[crm/requests] member directory unavailable: ${describeError(membersResult.error)}`
    )

  const departments: FilterDepartment[] =
    departmentsResult.data?.data.map((dept) => ({
      id: dept.id,
      name: dept.name,
    })) ?? []

  const departmentNames = new Map(
    departments.map((dept) => [dept.id, dept.name])
  )

  const members: FilterMember[] =
    membersResult.data?.data.map((m) => {
      const nameParts = [m.first_name, m.last_name].filter(Boolean)
      const name =
        nameParts.length > 0 ? nameParts.join(' ') : (m.email ?? m.user_id)
      return {
        id: m.id,
        userId: m.user_id,
        name,
        email: m.email,
        avatar: m.avatar,
      }
    }) ?? []

  const membersByUserId = new Map(members.map((m) => [m.userId, m]))

  const customersById = new Map(
    customersResult.data.data.map(({ profile, customer }) => [
      profile.id,
      resolveCustomerIdentity(customer, profile.billingCustomerId),
    ])
  )

  const rows: RequestListRow[] = requestsResult.data.data.map((request) => {
    const customer = customersById.get(request.customerId)
    const assignee = request.assigneeId
      ? membersByUserId.get(request.assigneeId)
      : undefined

    return {
      id: request.id,
      number: request.number,
      subject: request.subject,
      status: request.status,
      priority: request.priority,
      source: request.source,
      createdAt: request.createdAt,
      customerName: customer?.name ?? 'Unknown customer',
      customerIsBusiness: customer?.isBusiness ?? false,
      isAssigned: Boolean(request.assigneeId),
      assigneeName: assignee?.name ?? null,
      assigneeAvatar: assignee?.avatar ?? null,
      teamName: request.teamId
        ? (departmentNames.get(request.teamId) ?? null)
        : null,
    }
  })

  return (
    <div className="space-y-3">
      {departmentsResult.error ? (
        <AppError
          title="Team information is temporarily unavailable"
          error={departmentsResult.error}
          variant="inline"
        />
      ) : null}
      {membersResult.error ? (
        <AppError
          title="Member information is temporarily unavailable"
          error={membersResult.error}
          variant="inline"
        />
      ) : null}
      <RequestsList
        requests={rows}
        filterBar={
          <RequestsFilterBar
            selectedTeam={team}
            selectedAssignee={assignee}
            departments={departments}
            members={members}
          />
        }
      />
    </div>
  )
}
