import { AppHttpError, appError } from '@/http/errors'
import { adjust as adjustInventory } from '@/modules/inventory'

import { serializeCatalog } from './catalog.serializers'
import { items } from './repositories/items'
import type { ItemStockAdjustmentParams } from './schemas/item'

/** Preserves the Item API shape while Inventory owns the stock mutation. */
export async function adjustItemStock(
  tenantId: string,
  itemId: string,
  body: ItemStockAdjustmentParams,
  createdBy?: string,
  sourceAppId?: string
) {
  if (sourceAppId) {
    const owned = await items.retrieve(tenantId, itemId, sourceAppId)
    if (!owned)
      throw new AppHttpError({
        code: 'item/not-found',
        message: 'item not found.',
        httpStatus: 404,
      })
  }

  const adjusted = await adjustInventory(tenantId, {
    target: { type: 'item', id: itemId },
    quantity: body.quantity,
    note: body.note,
    createdBy,
  })
  if (adjusted.error !== null) {
    if (adjusted.code)
      throw appError(adjusted.code, {
        message: adjusted.error,
        httpStatus: adjusted.status,
      })
    throw new AppHttpError({
      code:
        adjusted.status === 404
          ? 'item/not-found'
          : adjusted.status === 409
            ? 'item/conflict'
            : adjusted.status === 422
              ? 'validation/invalid-request'
              : 'internal/error',
      message: adjusted.error,
      httpStatus: adjusted.status ?? 500,
    })
  }

  const item = await items.retrieve(tenantId, itemId, sourceAppId)
  if (!item)
    throw new AppHttpError({
      code: 'item/not-found',
      message: 'item not found.',
      httpStatus: 404,
    })

  return serializeCatalog('item', item)
}
