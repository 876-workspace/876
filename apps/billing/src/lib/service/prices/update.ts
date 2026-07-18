import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'
import type { PriceUpdateParams } from '@/types/price'
import type { ServiceResult } from '@/types/api'

import { err, ok } from '../result'

/** Updates a billing price. */
export async function update(
  tenantId: string,
  priceId: string,
  params: PriceUpdateParams
): ServiceResult<{ id: string }> {
  if (Object.keys(params).length === 0) return err('Nothing to update.', 422)

  const data: Record<string, unknown> = {
    updatedAt: nowUnixSeconds(),
  }

  if (params.nickname !== undefined) data.nickname = params.nickname
  if (params.isActive !== undefined) data.isActive = params.isActive

  try {
    const result = await prisma.price.updateMany({
      where: { id: priceId, tenantId },
      data,
    })

    if (result.count === 0) return err('Price not found.', 404)

    return ok({ id: priceId })
  } catch (error) {
    console.error('[billing.service.update]', error)
    return err('Failed to update the price.', 500)
  }
}
