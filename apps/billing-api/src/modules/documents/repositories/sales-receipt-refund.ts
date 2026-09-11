import type { Prisma } from '@/db'

/** Loads the immutable sale, original payment routing, and prior corrections. */
export function findSalesReceiptForRefund(
  tx: Prisma.TransactionClient,
  tenantId: string,
  salesReceiptId: string
) {
  return tx.salesReceipt.findFirst({
    where: { id: salesReceiptId, tenantId },
    include: {
      lines: { orderBy: { position: 'asc' } },
      payment: {
        select: {
          id: true,
          paymentModeId: true,
          depositAccountId: true,
        },
      },
      creditNotes: {
        select: {
          id: true,
          status: true,
          totalAmount: true,
          refunds: { select: { id: true, amount: true } },
        },
      },
    },
  })
}
