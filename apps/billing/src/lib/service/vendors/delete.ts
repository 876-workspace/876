import { prisma } from '@/lib/db'
import type { ServiceResult } from '@/types/api'

import { err, ok } from '../result'

/** Deletes a billing vendor if no associated documents exist. */
export async function deleteVendor(
  tenantId: string,
  id: string
): ServiceResult<{ id: string }> {
  try {
    const vendor = await prisma.vendor.findFirst({
      where: { id, tenantId },
    })

    if (!vendor) return err('Vendor not found.', 404)

    await prisma.vendor.delete({
      where: { id },
    })

    return ok({ id })
  } catch (error) {
    console.error('[billing.service.vendors.delete]', error)
    return err('Failed to delete the vendor.', 500)
  }
}
