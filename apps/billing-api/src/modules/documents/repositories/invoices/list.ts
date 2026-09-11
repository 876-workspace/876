import type { InvoiceStatus } from '@/db'
import { prisma } from '@/db/client'

/** Lists tenant-owned invoices with their customer and line snapshots. */
export function list(
  tenantId: string,
  status?: InvoiceStatus,
  sourceAppId?: string,
  recurringInvoiceId?: string
) {
  return prisma.invoice.findMany({
    where: {
      tenantId,
      ...(status ? { status } : {}),
      ...(sourceAppId ? { sourceAppId } : {}),
      ...(recurringInvoiceId ? { recurringInvoiceId } : {}),
    },
    include: { customer: true, quote: true, subscription: true, lines: true },
    orderBy: { createdAt: 'desc' },
  })
}
