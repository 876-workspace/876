import { prisma } from '@/lib/db'

export function retrieveByTenantAndUser(tenantId: string, userId: string) {
  return prisma.courierCustomerProfile.findUnique({
    where: {
      courier_customer_profiles_tenant_user_key: { tenantId, userId },
    },
  })
}
