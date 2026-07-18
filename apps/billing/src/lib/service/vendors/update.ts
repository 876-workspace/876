import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'
import type { VendorUpdateParams } from '@/types/vendor'
import type { ServiceResult } from '@/types/api'

import { err, ok } from '../result'
import { hasEnabledCurrency } from '../shared'

/** Updates a billing vendor's details. */
export async function update(
  tenantId: string,
  vendorId: string,
  params: VendorUpdateParams
): ServiceResult<{ id: string }> {
  if (Object.keys(params).length === 0) return err('Nothing to update.', 422)

  if (typeof params.currency === 'string') {
    if (!(await hasEnabledCurrency(tenantId, params.currency))) {
      return err('Enable the vendor currency before using it.', 422)
    }
  }

  const data: Record<string, unknown> = {
    updatedAt: nowUnixSeconds(),
  }

  if (params.name !== undefined) data.name = params.name
  if (params.email !== undefined) data.email = params.email
  if (params.phone !== undefined) data.phone = params.phone
  if (params.currency !== undefined) data.defaultCurrency = params.currency
  if (params.status !== undefined) data.status = params.status

  try {
    const result = await prisma.vendor.updateMany({
      where: { id: vendorId, tenantId },
      data,
    })

    if (result.count === 0) return err('Vendor not found.', 404)

    return ok({ id: vendorId })
  } catch (error) {
    console.error('[billing.service.vendors.update]', error)
    return err('Failed to update the vendor.', 500)
  }
}
