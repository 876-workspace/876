import { prisma } from '@/lib/db'
import type { CustomerMailboxListParams } from '@/types/mailbox'

export function list(params: CustomerMailboxListParams) {
  return prisma.mailbox.findMany({
    where: {
      tenantId: params.tenantId,
      customerId: params.customerId,
    },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }, { id: 'asc' }],
  })
}
