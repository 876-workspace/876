import { prisma } from '@/db/client'

export function list(tenantId: string) {
  return prisma.paymentMode.findMany({
    where: { tenantId },
    orderBy: [{ isDefault: 'desc' }, { isActive: 'desc' }, { name: 'asc' }],
  })
}
