import { prisma } from '@/db/client'

/** Retrieves one Sales Receipt with the immutable sale and payment evidence. */
export function retrieve(
  tenantId: string,
  salesReceiptId: string,
  sourceAppId?: string
) {
  return prisma.salesReceipt.findFirst({
    where: {
      id: salesReceiptId,
      tenantId,
      ...(sourceAppId ? { sourceAppId } : {}),
    },
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          companyName: true,
          email: true,
          phone: true,
          addresses: {
            orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
            take: 1,
          },
        },
      },
      quote: { select: { id: true, number: true, status: true } },
      salesperson: true,
      lines: { orderBy: { position: 'asc' } },
      payment: {
        include: {
          paymentMode: true,
          depositAccount: true,
          refunds: true,
          bankTransaction: true,
        },
      },
      creditNotes: {
        include: { refunds: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  })
}
