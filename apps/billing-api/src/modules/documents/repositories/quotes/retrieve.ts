import { prisma } from '@/db/client'

/** Retrieves a quote with its customer, lines, and converted invoice link. */
export async function retrieve(tenantId: string, quoteId: string) {
  return prisma.quote.findFirst({
    where: { id: quoteId, tenantId },
    include: {
      customer: { select: { id: true, name: true, email: true } },
      lines: true,
      convertedInvoice: { select: { id: true, number: true } },
    },
  })
}
