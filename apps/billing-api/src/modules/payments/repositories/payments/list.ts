import { prisma } from '@/db/client'

/** Lists received payments with their customer, deposit, and allocations. */
export function list(tenantId: string, sourceAppId?: string) {
  return prisma.payment.findMany({
    where: { tenantId, ...(sourceAppId ? { sourceAppId } : {}) },
    include: {
      customer: { select: { id: true, name: true } },
      paymentMode: true,
      depositAccount: true,
      invoiceAllocations: {
        where: { reversedAt: null },
        include: { invoice: true },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: [{ paymentDate: 'desc' }, { createdAt: 'desc' }],
  })
}
