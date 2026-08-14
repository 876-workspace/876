import { prisma } from '@/db/client'

export function retrieve(tenantId: string, refundId: string) {
  return prisma.refund.findFirst({
    where: { id: refundId, tenantId },
  })
}
