import { prisma } from '@/lib/db'

export function retrieve(tenantId: string, refundId: string) {
  return prisma.refund.findFirst({
    where: { id: refundId, tenantId },
  })
}
