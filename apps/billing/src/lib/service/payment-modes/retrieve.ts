import { prisma } from '@/lib/db'

export function retrieve(tenantId: string, modeId: string) {
  return prisma.paymentMode.findFirst({ where: { id: modeId, tenantId } })
}
