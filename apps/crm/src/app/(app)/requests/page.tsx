import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import {
  StatusFilterHeading,
  type StatusFilterOption,
} from '@876/ui/status-filter-heading'
import { Suspense } from 'react'

import { get876Client } from '@/lib/876'
import { requireCrmContext } from '@/lib/auth/require-crm-context'
import type { RequestStatus } from '@/types/crm'

import {
  RequestsFilterBar,
  type FilterDepartment,
  type FilterMember,
} from './_components/requests-filter-bar'
import { REQUESTS_SKELETON_COLUMNS } from './_components/requests-skeleton-columns'
import { RequestsTable, type CrmRequestRow } from './_components/requests-table'

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

      <Suspense
        fallback={<DataTableSkeleton columns={REQUESTS_SKELETON_COLUMNS} />}
      >
        <RequestsTableData
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

async function RequestsTableData({
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
  if (requestsResult.error) throw new Error(requestsResult.error.message)
  if (customersResult.error) throw new Error(customersResult.error.message)

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

  const customerNames = new Map(
    customersResult.data.data.map(({ profile, customer }) => [
      profile.id,
      customer?.name ?? profile.billingCustomerId,
    ])
  )

  const rows: CrmRequestRow[] = requestsResult.data.data.map((request) => ({
    id: request.id,
    number: request.number,
    subject: request.subject,
    customerId: request.customerId,
    customerName: customerNames.get(request.customerId) ?? request.customerId,
    teamId: request.teamId,
    teamName: request.teamId
      ? (departmentNames.get(request.teamId) ?? null)
      : null,
    assigneeId: request.assigneeId,
    assigneeName: request.assigneeId
      ? (membersByUserId.get(request.assigneeId)?.name ?? request.assigneeId)
      : null,
    assigneeAvatar: request.assigneeId
      ? (membersByUserId.get(request.assigneeId)?.avatar ?? null)
      : null,
    category: request.category,
    status: request.status,
    priority: request.priority,
    source: request.source,
    createdAt: request.createdAt,
  }))

  return (
    <RequestsTable
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
  )
}
