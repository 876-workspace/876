import { prisma } from '@/db/client'

/** Retrieves a quote with its customer, lines, and conversion links. */
export async function retrieve(tenantId: string, quoteId: string) {
  return prisma.quote.findFirst({
    where: { id: quoteId, tenantId },
    include: {
      customer: { select: { id: true, name: true, email: true } },
      lines: true,
      convertedInvoice: { select: { id: true, number: true } },
      convertedSalesReceipt: { select: { id: true, number: true } },
    },
  })
}
