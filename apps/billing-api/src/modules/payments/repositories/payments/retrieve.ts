import { prisma } from '@/db/client'

export function retrieve(
  tenantId: string,
  paymentId: string,
  sourceAppId?: string
) {
  return prisma.payment.findFirst({
    where: { id: paymentId, tenantId, ...(sourceAppId ? { sourceAppId } : {}) },
    include: {
      customer: { select: { id: true, name: true } },
      paymentMode: true,
      depositAccount: true,
      bankTransaction: true,
      refunds: {
        select: {
          id: true,
          number: true,
          amount: true,
          currency: true,
          reason: true,
          refundedAt: true,
          createdAt: true,
        },
        orderBy: [{ refundedAt: 'desc' }, { createdAt: 'desc' }],
      },
      invoiceAllocations: {
        where: { reversedAt: null },
        include: { invoice: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  })
}
