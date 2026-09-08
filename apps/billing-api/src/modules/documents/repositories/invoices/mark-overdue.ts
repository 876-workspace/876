import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/db/client'

import { overdueCandidateInvoiceStatuses } from '../../invoice-lifecycle'

/** Marks due open invoices overdue without changing their receivable value. */
export async function markOverdue(tenantId: string, asOf = nowUnixSeconds()) {
  return prisma.invoice.updateMany({
    where: {
      tenantId,
      dueAt: { lt: asOf },
      amountDue: { gt: 0n },
      status: { in: [...overdueCandidateInvoiceStatuses] },
    },
    data: { status: 'OVERDUE', updatedAt: asOf },
  })
}
