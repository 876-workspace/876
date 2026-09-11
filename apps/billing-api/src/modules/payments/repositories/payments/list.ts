import { prisma } from '@/db/client'

/** Lists ordinary Payments Received, excluding cash evidence owned by Sales Receipts. */
export function list(tenantId: string, sourceAppId?: string) {
  return prisma.payment.findMany({
    where: {
      tenantId,
      salesReceipt: { is: null },
      ...(sourceAppId ? { sourceAppId } : {}),
    },
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
