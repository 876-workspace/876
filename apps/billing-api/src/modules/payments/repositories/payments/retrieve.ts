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
      invoiceAllocations: {
        where: { reversedAt: null },
        include: { invoice: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  })
}
