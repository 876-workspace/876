import { prisma } from '@/db/client'

export function retrieve(tenantId: string, modeId: string) {
  return prisma.paymentMode.findFirst({ where: { id: modeId, tenantId } })
}
