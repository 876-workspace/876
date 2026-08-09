import { AppHttpError } from '@/platform/errors'

import {
  countTenantMailboxes,
  findMailboxByNumber,
  findTenantForMailboxAllocation,
  listMailboxRows,
} from './mailboxes.repository'
import {
  serializeMailbox,
  serializeMailboxAllocation,
} from './mailboxes.serializers'
import type {
  ListMailboxesQuery,
  Mailbox,
  MailboxAllocation,
} from './mailboxes.schemas'

const MAX_ALLOCATION_ATTEMPTS = 25

const tenantNotFound = () =>
  new AppHttpError({
    code: 'tenant/not-found',
    message: 'Not found.',
    httpStatus: 404,
  })

const allocationExhausted = () =>
  new AppHttpError({
    code: 'mailbox/allocation-exhausted',
    message: 'A mailbox number could not be allocated. Please try again.',
    httpStatus: 503,
  })

export async function listMailboxes(
  tenantId: string,
  query: ListMailboxesQuery
): Promise<{ data: Mailbox[]; hasMore: boolean }> {
  const rows = await listMailboxRows({ tenantId, query })
  const page = rows.slice(0, query.limit)
  return {
    data: (query.ending_before ? page.reverse() : page).map(serializeMailbox),
    hasMore: rows.length > query.limit,
  }
}

/**
 * Returns an available mailbox-number candidate without reserving it.
 * Callers insert it transactionally and must allocate once more when that
 * insert loses a race with a P2002 mailbox-number unique violation.
 */
export async function allocateMailbox(
  tenantId: string
): Promise<MailboxAllocation> {
  const tenant = await findTenantForMailboxAllocation(tenantId)
  if (!tenant) throw tenantNotFound()

  const prefix = tenant.mailboxPrefix?.trim().toUpperCase() ?? ''
  const count = await countTenantMailboxes(tenantId)

  for (let attempt = 0; attempt < MAX_ALLOCATION_ATTEMPTS; attempt += 1) {
    const candidate = String(1000 + count + attempt + 1).padStart(4, '0')
    const number = `${prefix}${candidate}`
    const existing = await findMailboxByNumber(tenantId, number)
    if (!existing) return serializeMailboxAllocation(number)
  }

  throw allocationExhausted()
}
