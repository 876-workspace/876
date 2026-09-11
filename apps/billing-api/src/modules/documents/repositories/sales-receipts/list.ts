import type { SalesReceiptStatus } from '@/db'
import { prisma } from '@/db/client'

/** Lists tenant-owned immediate paid sales with their customer/payment evidence. */
export function list(
  tenantId: string,
  status?: SalesReceiptStatus,
  sourceAppId?: string,
  customerId?: string
) {
  return prisma.salesReceipt.findMany({
    where: {
      tenantId,
      ...(status ? { status } : {}),
      ...(sourceAppId ? { sourceAppId } : {}),
      ...(customerId ? { customerId } : {}),
    },
    include: {
      customer: true,
      quote: true,
      salesperson: true,
      lines: true,
      payment: {
        include: {
          paymentMode: true,
          depositAccount: true,
          refunds: true,
        },
      },
      creditNotes: { include: { refunds: true } },
    },
    orderBy: [{ receiptAt: 'desc' }, { createdAt: 'desc' }],
  })
}
