import type { InvoiceStatus } from '@/db'
import { prisma } from '@/db/client'

/** Lists tenant-owned invoices with their customer and line snapshots. */
export function list(tenantId: string, status?: InvoiceStatus, sourceAppId?: string) {
  return prisma.invoice.findMany({
    where: {
      tenantId,
      ...(status ? { status } : {}),
      ...(sourceAppId ? { sourceAppId } : {}),
    },
    include: { customer: true, quote: true, subscription: true, lines: true },
    orderBy: { createdAt: 'desc' },
  })
}
