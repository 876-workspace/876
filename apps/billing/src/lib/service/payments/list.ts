import { prisma } from '@/lib/db'

/** Lists received payments with their customer, deposit, and allocations. */
export function list(tenantId: string) {
  return prisma.payment.findMany({
    where: { tenantId },
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
