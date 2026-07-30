import { prisma } from '@/lib/db'
import { ServiceResult, success, serviceError } from '@876/core/service'
import { usageAddress } from './usage'

export async function deleteAddress(
  tenantId: string,
  id: string
): Promise<ServiceResult<{ id: string; deleted: true }>> {
  const usage = await usageAddress(tenantId, id)
  
  if (usage.branchCount > 0 || usage.warehouseCount > 0 || usage.customerAddressCount > 0) {
    return serviceError(409, 'Address is in use and cannot be deleted')
  }

  try {
    await prisma.address.delete({
      where: { id_tenantId: { id, tenantId } }
    })
    return success({ id, deleted: true })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return serviceError(404, 'Address not found')
    }
    return serviceError(500, error.message || 'Internal error deleting address')
  }
}
