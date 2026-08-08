import { prisma } from '@/lib/db'

export function retrieveByTenantAndUser(tenantId: string, userId: string) {
  return prisma.courierCustomerProfile.findFirst({
    where: { tenantId, userId, deletedAt: null },
  })
}

export function retrieve(tenantId: string, id: string) {
  return prisma.courierCustomerProfile.findFirst({
    where: { id, tenantId, deletedAt: null },
  })
}
