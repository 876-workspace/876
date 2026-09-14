import type { CrmRequest, Customer } from '@876/crm'
import type { RequestListRow } from './request-list'

export type RequestListMember = {
  userId: string
  name: string
  avatar: string | null
}

export type RequestListTeam = {
  id: string
  name: string
}

/**
 * Joins request rows with customer/member/team identities already fetched by a
 * host. The function is intentionally transport-free so hosts can resolve the
 * same view model without creating N+1 resource calls inside shared UI.
 */
export function toRequestListRows({
  requests,
  customers,
  members = [],
  teams = [],
}: {
  requests: readonly CrmRequest[]
  customers: readonly Customer[]
  members?: readonly RequestListMember[]
  teams?: readonly RequestListTeam[]
}): RequestListRow[] {
  const customersByProfileId = new Map(
    customers.map((entry) => [entry.profile.id, entry])
  )
  const membersById = new Map(members.map((member) => [member.userId, member]))
  const teamsById = new Map(teams.map((team) => [team.id, team]))

  return requests.map((request) => {
    const customerEntry = customersByProfileId.get(request.customerId)
    const customer = customerEntry?.customer ?? null
    const assignee = request.assigneeId
      ? membersById.get(request.assigneeId)
      : undefined

    return {
      id: request.id,
      number: request.number,
      subject: request.subject,
      status: request.status,
      priority: request.priority,
      channel: request.channel,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
      customerName:
        customer?.name ??
        customerEntry?.profile.billingCustomerId ??
        request.customerId,
      customerIsBusiness: customer?.customerKind === 'BUSINESS',
      assigneeName: assignee?.name ?? request.assigneeId ?? null,
      assigneeAvatar: assignee?.avatar ?? null,
      teamName: request.teamId ? (teamsById.get(request.teamId)?.name ?? null) : null,
      sourceApp: request.sourceApp,
      relatedResourceType: request.relatedResourceType,
      relatedResourceId: request.relatedResourceId,
      relatedResourceSnapshot: request.relatedResourceSnapshot,
    }
  })
}
