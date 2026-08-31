import { AppError } from '@876/ui/app-error'
import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import {
  StatusFilterHeading,
  type StatusFilterOption,
} from '@876/ui/status-filter-heading'
import { Suspense } from 'react'

import { resolveCustomerIdentity } from '@/features/customers/customer-identity'
import { requireCrmContext } from '@/lib/auth/require-crm-context'
import { crm } from '@/lib/services/crm'
import { getWorkspace } from '@/lib/services/workspace'
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
  searchParams: Promise<{ status?: string; team?: string; assignee?: string }>
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
  const workspace = await getWorkspace()

  let teamId: string | undefined
  if (team === 'none') teamId = 'unassigned'
  else if (team !== 'all') teamId = team

  let assigneeId: string | undefined
  if (assignee === 'me') assigneeId = context.userId
  else if (assignee === 'unassigned') assigneeId = 'unassigned'
  else if (assignee !== 'all') assigneeId = assignee

  const [requestsResult, customersResult, departmentsResult, membersResult] =
    await Promise.all([
      crm.requests.list(context.orgId, { status, teamId, assigneeId }),
      crm.customers.list(context.orgId),
      workspace.departments.list(context.orgId),
      workspace.members.list(context.orgId),
    ])

  if (departmentsResult.error)
    console.error(
      `[crm/requests] team directory unavailable: ${describeError(departmentsResult.error)}`
    )
  if (membersResult.error)
    console.error(
      `[crm/requests] member directory unavailable: ${describeError(membersResult.error)}`
    )

  const departments: FilterDepartment[] =
    departmentsResult.data?.data.map((department) => ({
      id: department.id,
      name: department.name,
    })) ?? []
  const departmentNames = new Map(
    departments.map((department) => [department.id, department.name])
  )

  const members: FilterMember[] =
    membersResult.data?.data.map((member) => {
      const nameParts = [member.first_name, member.last_name].filter(Boolean)
      const name =
        nameParts.length > 0
          ? nameParts.join(' ')
          : (member.email ?? member.user_id)
      return {
        id: member.id,
        userId: member.user_id,
        name,
        email: member.email,
        avatar: member.avatar,
      }
    }) ?? []
  const membersByUserId = new Map(
    members.map((member) => [member.userId, member])
  )

  const customersById = new Map(
    (customersResult.data?.data ?? []).map(({ profile, customer }) => [
      profile.id,
      resolveCustomerIdentity(customer, profile.billingCustomerId),
    ])
  )

  const rows: RequestListRow[] = (requestsResult.data?.data ?? []).map(
    (request) => {
      const customer = customersById.get(request.customerId)
      const requestAssignee = request.assigneeId
        ? membersByUserId.get(request.assigneeId)
        : undefined
      return {
        id: request.id,
        number: request.number,
        subject: request.subject,
        status: request.status,
        priority: request.priority,
        channel: request.channel,
        createdAt: request.createdAt,
        customerName: customer?.name ?? 'Unknown customer',
        customerIsBusiness: customer?.isBusiness ?? false,
        isAssigned: Boolean(request.assigneeId),
        assigneeName: requestAssignee?.name ?? null,
        assigneeAvatar: requestAssignee?.avatar ?? null,
        teamName: request.teamId
          ? (departmentNames.get(request.teamId) ?? null)
          : null,
      }
    }
  )

  return (
    <div className="space-y-3">
      {requestsResult.error ? (
        <AppError
          title="Some request data could not be loaded"
          error={requestsResult.error}
          variant="banner"
        />
      ) : null}
      {customersResult.error ? (
        <AppError
          title="Customer details are temporarily incomplete"
          error={customersResult.error}
          variant="inline"
        />
      ) : null}
      {departmentsResult.error ? (
        <AppError
          title="Team information is temporarily incomplete"
          error={departmentsResult.error}
          variant="inline"
        />
      ) : null}
      {membersResult.error ? (
        <AppError
          title="Member information is temporarily incomplete"
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
