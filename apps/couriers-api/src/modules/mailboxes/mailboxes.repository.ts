import { prisma } from '@/db/client'

import type { MailboxRow } from './mailboxes.serializers'

export async function listMailboxRows(
  tenantId: string,
  customerId?: string
): Promise<MailboxRow[]> {
  const rows = await prisma.mailbox.findMany({
    where: { tenantId, ...(customerId === undefined ? {} : { customerId }) },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }, { id: 'asc' }],
  })

  return rows
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
