import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'
import type { ServiceResult } from '@/types/api'
import type { PriceListUpdateParams } from '@/types/price-list'

import { err, ok } from '../result'
import { isUniqueConstraintError } from '../shared'

export async function update(
  tenantId: string,
  priceListId: string,
  params: PriceListUpdateParams
): ServiceResult<{ id: string }> {
  if (Object.keys(params).length === 0) return err('Nothing to update.', 422)
  try {
    const result = await prisma.priceList.updateMany({
      where: { id: priceListId, tenantId },
      data: { ...params, updatedAt: nowUnixSeconds() },
    })
    if (result.count === 0) return err('Price list not found.', 404)
    return ok({ id: priceListId })
  } catch (error) {
    if (isUniqueConstraintError(error))
      return err('A price list with this name already exists.', 409)
    console.error('[billing.service.priceLists.update]', error)
    return err('Failed to update the price list.', 500)
  }
}
