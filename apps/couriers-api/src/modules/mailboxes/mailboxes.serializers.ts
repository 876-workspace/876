import { fromDbUnixSeconds } from '@/platform/timestamps'

import type { Mailbox, MailboxAllocation } from './mailboxes.schemas'

export type MailboxRow = {
  id: string
  tenantId: string
  customerId: string
  number: string
  isPrimary: boolean
  createdAt: number | bigint
  updatedAt: number | bigint
}

export function serializeMailbox(row: MailboxRow): Mailbox {
  return {
    object: 'mailbox',
    id: row.id,
    tenant_id: row.tenantId,
    customer_id: row.customerId,
    number: row.number,
    is_primary: row.isPrimary,
    created_at: fromDbUnixSeconds(row.createdAt),
    updated_at: fromDbUnixSeconds(row.updatedAt),
  }
}

export function serializeMailboxAllocation(number: string): MailboxAllocation {
  return { object: 'mailbox_allocation', number }
}
