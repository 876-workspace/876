import { prisma } from '@/db/client'

import type { MailboxRow } from './mailboxes.serializers'
import type { ListMailboxesQuery } from './mailboxes.schemas'

export async function listMailboxRows(options: {
  tenantId: string
  query: ListMailboxesQuery
}): Promise<MailboxRow[]> {
  const cursorId = options.query.starting_after ?? options.query.ending_before
  const anchor = cursorId
    ? await findMailboxForTenant(options.tenantId, cursorId)
    : null

  if (cursorId && !anchor) return []

  const cursorWhere = anchor
    ? options.query.starting_after
      ? mailboxesAfter(anchor)
      : mailboxesBefore(anchor)
    : {}

  const rows = await prisma.mailbox.findMany({
    where: {
      tenantId: options.tenantId,
      ...(options.query.customer_id
        ? { customerId: options.query.customer_id }
        : {}),
      ...cursorWhere,
    },
    orderBy: options.query.ending_before
      ? [{ isPrimary: 'asc' }, { createdAt: 'desc' }, { id: 'desc' }]
      : [{ isPrimary: 'desc' }, { createdAt: 'asc' }, { id: 'asc' }],
    take: options.query.limit + 1,
  })

  return rows as MailboxRow[]
}

export function findMailboxForTenant(tenantId: string, id: string) {
  return prisma.mailbox.findFirst({ where: { tenantId, id } })
}

export function findTenantForMailboxAllocation(tenantId: string) {
  return prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { mailboxPrefix: true },
  })
}

export function countTenantMailboxes(tenantId: string): Promise<number> {
  return prisma.mailbox.count({ where: { tenantId } })
}

export function findMailboxByNumber(tenantId: string, number: string) {
  return prisma.mailbox.findUnique({
    where: {
      mailboxes_tenant_id_number_key: { tenantId, number },
    },
    select: { id: true },
  })
}

function mailboxesAfter(anchor: MailboxRow) {
  return {
    OR: [
      { isPrimary: { lt: anchor.isPrimary } },
      { isPrimary: anchor.isPrimary, createdAt: { gt: anchor.createdAt } },
      {
        isPrimary: anchor.isPrimary,
        createdAt: anchor.createdAt,
        id: { gt: anchor.id },
      },
    ],
  }
}

function mailboxesBefore(anchor: MailboxRow) {
  return {
    OR: [
      { isPrimary: { gt: anchor.isPrimary } },
      { isPrimary: anchor.isPrimary, createdAt: { lt: anchor.createdAt } },
      {
        isPrimary: anchor.isPrimary,
        createdAt: anchor.createdAt,
        id: { lt: anchor.id },
      },
    ],
  }
}
