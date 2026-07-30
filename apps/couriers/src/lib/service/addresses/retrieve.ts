import { prisma } from '@/lib/db'
import type { AddressView } from '@/types/address'

export async function retrieveAddress(
  tenantId: string,
  id: string
): Promise<AddressView | null> {
  const address = await prisma.address.findUnique({
    where: { id_tenantId: { id, tenantId } },
  })

  return address
}
