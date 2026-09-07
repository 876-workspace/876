import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/db/client'
import type { ItemUpdateParams } from '../../schemas/item'
import type { ServiceResult } from '../../schemas/api'

import { err, ok } from '../result'
import { hasEnabledCurrency } from '../shared'
import { isUniqueConstraintError } from '../prisma-error'

/** Updates a billing item without bypassing the stock-adjustment ledger. */
export async function update(
  tenantId: string,
  itemId: string,
  params: ItemUpdateParams
): ServiceResult<{ id: string }> {
  if (Object.keys(params).length === 0) return err('Nothing to update.', 422)

  const current = await prisma.item.findFirst({
    where: { id: itemId, tenantId },
    select: {
      type: true,
      trackStock: true,
      stockQuantity: true,
    },
  })
  if (!current) return err('Item not found.', 404)

  if (typeof params.defaultSellingCurrency === 'string') {
    if (!(await hasEnabledCurrency(tenantId, params.defaultSellingCurrency)))
      return err('Enable the selling currency before using it on an item.', 422)
  }

  if (typeof params.defaultCostCurrency === 'string') {
    if (!(await hasEnabledCurrency(tenantId, params.defaultCostCurrency)))
      return err('Enable the cost currency before using it on an item.', 422)
  }

  const nextType = params.type ?? current.type
  const nextTrackStock = params.trackStock ?? current.trackStock
  if (nextType === 'SERVICE' && nextTrackStock)
    return err('Stock tracking is available only for goods.', 422)
  if (
    params.lowStockThreshold != null &&
    !nextTrackStock
  )
    return err('Enable stock tracking before setting a low-stock threshold.', 422)
  if (params.allowOutOfStock === true && !nextTrackStock)
    return err('Enable stock tracking before allowing out-of-stock sales.', 422)

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
  if (params.trackStock !== undefined) data.trackStock = params.trackStock
  if (params.lowStockThreshold !== undefined)
    data.lowStockThreshold = params.lowStockThreshold
  if (params.allowOutOfStock !== undefined)
    data.allowOutOfStock = params.allowOutOfStock
  if (params.isActive !== undefined) data.isActive = params.isActive

  if (!current.trackStock && nextTrackStock)
    data.stockQuantity = current.stockQuantity ?? 0

  if (nextType === 'SERVICE') {
    data.trackStock = false
    data.stockQuantity = null
    data.lowStockThreshold = null
    data.allowOutOfStock = false
  }

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

    console.error('[billing.service.items.update]', error)
    return err('Failed to update the item.', 500)
  }
}
