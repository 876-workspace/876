import { prisma } from '@/lib/db'
import type { AddressUsage } from '@/types/address'

type OwnerCount = {
  count(args: {
    where: { tenantId: string; addressId: string }
  }): Promise<number>
}

/**
 * Structural rather than `Prisma.TransactionClient`, because the extended
 * client and the transaction client are not mutually assignable — this is the
 * surface both actually share.
 */
type UsageClient = {
  branch: OwnerCount
  warehouse: OwnerCount
  customerAddress: OwnerCount
}

/**
 * Counts the owners referencing an address. Counts only — an organization-wide
 * address list must not disclose which customers live at a given address.
 *
 * Accepts a transaction client so a delete can count and remove atomically
 * rather than deciding on a count that another request has already invalidated.
 */
export async function usage(
  tenantId: string,
  id: string,
  client: UsageClient = prisma
): Promise<AddressUsage> {
  const [branchCount, warehouseCount, customerAddressCount] = await Promise.all(
    [
      client.branch.count({ where: { tenantId, addressId: id } }),
      client.warehouse.count({ where: { tenantId, addressId: id } }),
      client.customerAddress.count({ where: { tenantId, addressId: id } }),
    ]
  )

  return { branchCount, warehouseCount, customerAddressCount }
}

export function isAddressInUse(counts: AddressUsage): boolean {
  return (
    counts.branchCount > 0 ||
    counts.warehouseCount > 0 ||
    counts.customerAddressCount > 0
  )
}
