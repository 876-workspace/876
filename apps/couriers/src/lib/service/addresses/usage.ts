import { prisma } from '@/lib/db'

export async function usageAddress(
  tenantId: string,
  id: string
): Promise<{ branchCount: number; warehouseCount: number; customerAddressCount: number }> {
  const [branchCount, warehouseCount, customerAddressCount] = await Promise.all([
    prisma.branch.count({ where: { tenantId, addressId: id } }),
    prisma.warehouse.count({ where: { tenantId, addressId: id } }),
    prisma.customerAddress.count({ where: { tenantId, addressId: id } })
  ])

  return { branchCount, warehouseCount, customerAddressCount }
}
