import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'

/** Marks due open invoices overdue without changing their receivable value. */
export async function markOverdue(tenantId: string, asOf = nowUnixSeconds()) {
  return prisma.invoice.updateMany({
    where: {
      tenantId,
      dueAt: { lt: asOf },
      amountDue: { gt: 0n },
      status: { in: ['OPEN', 'SENT', 'PARTIALLY_PAID'] },
    },
    data: { status: 'OVERDUE', updatedAt: asOf },
  })
}
