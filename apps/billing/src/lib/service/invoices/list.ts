import { prisma, type InvoiceStatus } from '@/lib/db'

/** Lists tenant-owned invoices with their customer and line snapshots. */
export function list(tenantId: string, status?: InvoiceStatus) {
  return prisma.invoice.findMany({
    where: {
      tenantId,
      ...(status ? { status } : {}),
    },
    include: { customer: true, quote: true, subscription: true, lines: true },
    orderBy: { createdAt: 'desc' },
  })
}
