import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/db/client'
import type { Prisma } from '@/db'

import { overdueCandidateInvoiceStatuses } from '../../invoice-lifecycle'

function markOverdueWhere(scope: Prisma.InvoiceWhereInput, asOf: number) {
  return prisma.invoice.updateMany({
    where: {
      ...scope,
      dueAt: { lt: asOf },
      amountDue: { gt: 0n },
      status: { in: [...overdueCandidateInvoiceStatuses] },
    },
    data: { status: 'OVERDUE', updatedAt: asOf },
  })
}

/** Marks due open invoices overdue without changing their receivable value. */
export async function markOverdue(tenantId: string, asOf = nowUnixSeconds()) {
  return markOverdueWhere({ tenantId }, asOf)
}

/** Applies the same collectible-status projection to every active workspace. */
export async function markOverdueAcrossActiveTenants(asOf = nowUnixSeconds()) {
  return markOverdueWhere(
    { tenant: { status: 'ACTIVE', deletedAt: null } },
    asOf
  )
}
