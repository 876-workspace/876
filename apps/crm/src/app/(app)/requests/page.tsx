import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import {
  StatusFilterHeading,
  type StatusFilterOption,
} from '@876/ui/status-filter-heading'
import { Suspense } from 'react'

import { get876Client } from '@/lib/876'
import { requireCrmContext } from '@/lib/auth/require-crm-context'
import { resolveCustomerIdentity } from '@/features/customers/customer-identity'
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
  if (requestsResult.error) throw new Error(requestsResult.error.message)
  if (customersResult.error) throw new Error(customersResult.error.message)

  // The directory is enrichment, so a failure here must not take the queue
  // down — but it must not pass silently either. Swallowing it with `?? []` is
  // what made a broken members call look like a page full of raw `user_…` ids
  // instead of an error anyone could find.
  // Flattened to a string: an error object logged as a second argument renders
  // as `{}` in the Next.js overlay, which is how the first pass at this told us
  // the call failed without telling us why.
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

  // The party, not its contact: a business row is titled by the company and
  // drawn with a squared avatar, which is what `isBusiness` carries.
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
      // An opaque id is not a name. When the directory cannot resolve the
      // assignee, the row says the request is assigned without inventing a
      // label for whom — and never claims it is unassigned.
      isAssigned: Boolean(request.assigneeId),
      assigneeName: assignee?.name ?? null,
      assigneeAvatar: assignee?.avatar ?? null,
      teamName: request.teamId
        ? (departmentNames.get(request.teamId) ?? null)
        : null,
    }
  })

  return (
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
  )
}
