import { prisma } from '@/lib/db'
import type { AddressView } from '@/types/address'

export async function listAddresses(params: {
  tenantId: string
  isActive?: boolean
  countryCode?: string
}): Promise<AddressView[]> {
  const { tenantId, isActive, countryCode } = params
  
  const addresses = await prisma.address.findMany({
    where: {
      tenantId,
      ...(isActive !== undefined ? { isActive } : {}),
      ...(countryCode ? { countryCode } : {}),
    },
    orderBy: { createdAt: 'desc' }
  })

  return addresses
}
