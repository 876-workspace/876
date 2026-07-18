import { prisma } from '@/lib/db'

export function list(tenantId: string) {
  return prisma.courierCustomerProfile.findMany({
    where: { tenantId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  })
}
