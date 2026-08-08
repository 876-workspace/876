import { prisma } from '@/lib/db'
import type { CustomerStatus } from '@/types/customer'

/**
 * Lists the tenant's own courier customers.
 *
 * A courier customer is someone enrolled in *this* workspace — never the whole
 * shared customer registry. A party who is a customer of the same organization
 * in another 876 app has no courier profile and must not surface here.
 */
export function list(tenantId: string, status?: CustomerStatus) {
  return prisma.courierCustomerProfile.findMany({
    where: { tenantId, ...(status ? { status } : {}) },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  })
}
