import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'
import type { ItemUpdateParams } from '@/types/item'
import type { ServiceResult } from '@/types/api'

import { err, ok } from '../result'
import { hasEnabledCurrency, isUniqueConstraintError } from '../shared'

/** Updates a billing item. */
export async function update(
  tenantId: string,
  itemId: string,
  params: ItemUpdateParams
): ServiceResult<{ id: string }> {
  if (Object.keys(params).length === 0) return err('Nothing to update.', 422)

  if (typeof params.defaultSellingCurrency === 'string') {
    if (!(await hasEnabledCurrency(tenantId, params.defaultSellingCurrency))) {
      return err('Enable the selling currency before using it on an item.', 422)
    }
  }

  if (typeof params.defaultCostCurrency === 'string') {
    if (!(await hasEnabledCurrency(tenantId, params.defaultCostCurrency))) {
      return err('Enable the cost currency before using it on an item.', 422)
    }
  }

  const data: Record<string, unknown> = {
    updatedAt: nowUnixSeconds(),
  }

  if (params.type !== undefined) data.type = params.type
  if (params.name !== undefined) data.name = params.name
  if (params.sku !== undefined) data.sku = params.sku
  if (params.unit !== undefined) data.unit = params.unit
  if (params.description !== undefined) data.description = params.description
  if (params.imageUrl !== undefined) data.imageUrl = params.imageUrl
  if (params.defaultSellingAmount !== undefined)
    data.defaultSellingAmount = params.defaultSellingAmount
  if (params.defaultSellingCurrency !== undefined)
    data.defaultSellingCurrency = params.defaultSellingCurrency
  if (params.defaultCostAmount !== undefined)
    data.defaultCostAmount = params.defaultCostAmount
  if (params.defaultCostCurrency !== undefined)
    data.defaultCostCurrency = params.defaultCostCurrency
  if (params.isTaxable !== undefined) data.isTaxable = params.isTaxable
  if (params.taxCode !== undefined) data.taxCode = params.taxCode
  if (params.isActive !== undefined) data.isActive = params.isActive

  try {
    const result = await prisma.item.updateMany({
      where: { id: itemId, tenantId },
      data,
    })

    if (result.count === 0) return err('Item not found.', 404)

    return ok({ id: itemId })
  } catch (error) {
    if (isUniqueConstraintError(error))
      return err('An item with this SKU already exists.', 409)

    console.error('[billing.service.update]', error)
    return err('Failed to update the item.', 500)
  }
}
