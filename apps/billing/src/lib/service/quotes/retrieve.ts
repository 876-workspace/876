import { prisma } from '@/lib/db'

/** Retrieves a quote with its customer and lines. */
export async function retrieve(tenantId: string, quoteId: string) {
  return prisma.quote.findFirst({
    where: { id: quoteId, tenantId },
    include: {
      customer: { select: { id: true, name: true, email: true } },
      lines: true,
    },
  })
}
