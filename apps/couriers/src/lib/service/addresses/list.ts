import { prisma, type Address } from '@/lib/db'
import type { AddressListParams } from '@/types/address'

/** Lists a tenant's addresses, newest first. */
export async function list(
  tenantId: string,
  params: AddressListParams = {}
): Promise<Address[]> {
  return prisma.address.findMany({
    where: {
      tenantId,
      ...(params.isActive === undefined ? {} : { isActive: params.isActive }),
      ...(params.countryCode === undefined
        ? {}
        : { countryCode: params.countryCode.toUpperCase() }),
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  })
}
