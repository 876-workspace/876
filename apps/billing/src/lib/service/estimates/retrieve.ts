import { prisma } from '@/lib/db'

/** Retrieves a estimate with its customer and lines. */
export async function retrieve(tenantId: string, estimateId: string) {
  return prisma.estimate.findFirst({
    where: { id: estimateId, tenantId },
    include: {
      customer: true,
      lines: {
        include: { item: true, price: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  })
}
