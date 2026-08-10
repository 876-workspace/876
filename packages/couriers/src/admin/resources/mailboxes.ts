import { AdminRequest } from '../request'
import type { AdminRuntime } from '../runtime'
import {
  mailboxAllocationSchema,
  mailboxListSchema,
  type MailboxAllocation,
  type ListMailboxesParams,
  type MailboxList,
} from '../types/mailbox.schema'

export function createMailboxesResource(runtime: AdminRuntime) {
  const path = (tenantId: string) =>
    `/v1/tenants/${encodeURIComponent(tenantId)}/mailboxes`

  return {
    list(tenantId: string, params: ListMailboxesParams = {}) {
      return AdminRequest<MailboxList>(
        runtime,
        { method: 'GET', path: path(tenantId), query: params },
        mailboxListSchema
      )
    },
    allocate(tenantId: string) {
      return AdminRequest<MailboxAllocation>(
        runtime,
        { method: 'POST', path: `${path(tenantId)}/allocations` },
        mailboxAllocationSchema
      )
    },
  }
}
