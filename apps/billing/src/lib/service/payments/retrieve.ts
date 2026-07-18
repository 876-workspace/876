import { prisma } from '@/lib/db'

export function retrieve(tenantId: string, paymentId: string) {
  return prisma.payment.findFirst({
    where: { id: paymentId, tenantId },
    include: {
      customer: { select: { id: true, name: true } },
      paymentMode: true,
      depositAccount: true,
      bankTransaction: true,
      invoiceAllocations: {
        where: { reversedAt: null },
        include: { invoice: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  })
}
