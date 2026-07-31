import { prisma, type Address } from '@/lib/db'

/**
 * Retrieves one of a tenant's addresses. An address belonging to another tenant
 * is indistinguishable from one that does not exist.
 */
export async function retrieve(
  tenantId: string,
  id: string
): Promise<Address | null> {
  return prisma.address.findFirst({ where: { id, tenantId } })
}
