import { resolveCustomerIdentity } from './customer-identity'
import type { RequestListRow } from './components/requests-list'
import type { CrmRequest, DirectoryMember, RequestDepartment } from './types'

/** One entry of `crm.customers.list()`. */
type CustomerProfileEntry = {
  profile: { id: string; billingCustomerId: string }
  customer: Parameters<typeof resolveCustomerIdentity>[0]
}

/**
 * Flattens a page of requests into queue rows.
 *
 * The names a queue is read by — the customer, the assignee, the team — live in
 * three different places, so they are resolved once per page and joined in
 * memory here. Doing it per row would be an N+1 against CRM for every request
 * on screen.
 */
export function toRequestListRows({
  requests,
  customerProfiles,
  members,
  departments,
}: {
  requests: readonly CrmRequest[]
  customerProfiles: readonly CustomerProfileEntry[]
  members: readonly DirectoryMember[]
  departments: readonly RequestDepartment[]
}): RequestListRow[] {
  const customersById = new Map(
    customerProfiles.map((entry) => [
      entry.profile.id,
      resolveCustomerIdentity(entry.customer, entry.profile.billingCustomerId),
    ])
  )
  const membersById = new Map(members.map((member) => [member.userId, member]))
  const departmentsById = new Map(
    departments.map((department) => [department.id, department])
  )

  return requests.map((request) => {
    const customer = customersById.get(request.customerId)
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
      customerName: customer?.name ?? request.customerId,
      customerIsBusiness: customer?.isBusiness ?? false,
      assigneeName: assignee?.name ?? request.assigneeId ?? null,
      assigneeAvatar: assignee?.avatar ?? null,
      teamName: request.teamId
        ? (departmentsById.get(request.teamId)?.name ?? null)
        : null,
      sourceApp: request.sourceApp,
      relatedResourceType: request.relatedResourceType,
      relatedResourceId: request.relatedResourceId,
      relatedResourceSnapshot: request.relatedResourceSnapshot,
    }
  })
}
