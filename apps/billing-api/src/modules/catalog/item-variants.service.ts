import { AppHttpError, appError } from '@/http/errors'
import { adjust as adjustInventory } from '@/modules/inventory'
import type { ServiceResult } from './schemas/api'
import type {
  ItemMediaAttachParams,
  ItemMediaReorderParams,
  ItemStockAdjustmentParams,
  ItemVariantGenerateParams,
  ItemVariantUpdateParams,
} from './schemas/item'
import type { ItemPreferencesUpdateParams } from './schemas/item-preference'
import { serializeCatalog } from './catalog.serializers'
import {
  itemMediaList,
  itemVariantList,
  serializeItemVariant,
} from './item-variant.serializers'
import { itemPreferences } from './repositories/item-preferences'
import { items } from './repositories/items'

async function unwrap<T>(result: Awaited<ServiceResult<T>>): Promise<T> {
  if (result.error === null) return result.data
  if (result.code)
    throw appError(result.code, {
      message: result.error,
      httpStatus: result.status,
    })

  throw new AppHttpError({
    code:
      result.status === 404
        ? 'item/not-found'
        : result.status === 409
          ? 'item/conflict'
          : result.status === 422
            ? 'validation/invalid-request'
            : 'internal/error',
    message: result.error,
    httpStatus: result.status ?? 500,
  })
}

async function ownedItem(
  tenantId: string,
  itemId: string,
  sourceAppId?: string
) {
  const item = await items.retrieve(tenantId, itemId, sourceAppId)
  if (!item)
    throw new AppHttpError({
      code: 'item/not-found',
      message: 'item not found.',
      httpStatus: 404,
    })
  return item
}

async function requireVariantsEnabled(tenantId: string) {
  const preferences = await itemPreferences.retrieve(tenantId)
  if (!preferences.productVariants)
    throw appError('billing/item-variants-disabled')
}

async function retrieveVariant(
  tenantId: string,
  itemId: string,
  variantId: string,
  sourceAppId?: string
) {
  await ownedItem(tenantId, itemId, sourceAppId)
  const variant = await items.variants.retrieve(tenantId, itemId, variantId)
  if (!variant) throw appError('billing/item-variant-not-found')
  return serializeItemVariant(variant)
}

async function listMedia(
  tenantId: string,
  itemId: string,
  variantId?: string,
  sourceAppId?: string
) {
  await ownedItem(tenantId, itemId, sourceAppId)
  const rows = await items.media.list(tenantId, itemId, variantId)
  if (!rows)
    throw variantId
      ? appError('billing/item-variant-not-found')
      : new AppHttpError({
          code: 'item/not-found',
          message: 'item not found.',
          httpStatus: 404,
        })

  const path = variantId
    ? `/api/v1/items/${itemId}/variants/${variantId}/media`
    : `/api/v1/items/${itemId}/media`
  return itemMediaList(rows, path)
}

export const itemVariantsService = {
  getPreferences(tenantId: string) {
    return itemPreferences.retrieve(tenantId)
  },

  async updatePreferences(
    tenantId: string,
    body: ItemPreferencesUpdateParams,
    updatedBy?: string
  ) {
    if (
      !body.productVariants &&
      (await itemPreferences.hasVariantItems(tenantId))
    )
      throw appError('billing/item-variants-in-use')

    return itemPreferences.update(tenantId, body.productVariants, updatedBy)
  },

  async requireEnabled(tenantId: string) {
    await requireVariantsEnabled(tenantId)
  },

  async list(
    tenantId: string,
    itemId: string,
    sourceAppId?: string,
    url = `/api/v1/items/${itemId}/variants`,
    active?: boolean
  ) {
    await ownedItem(tenantId, itemId, sourceAppId)
    return itemVariantList(
      await items.variants.list(tenantId, itemId, active),
      url
    )
  },

  async search(
    tenantId: string,
    q: string,
    limit: number,
    sourceAppId?: string,
    url = '/api/v1/item-variants'
  ) {
    return itemVariantList(
      await items.variants.search(tenantId, q, limit, sourceAppId),
      url
    )
  },

  retrieve: retrieveVariant,

  async generate(
    tenantId: string,
    itemId: string,
    body: ItemVariantGenerateParams,
    sourceAppId?: string
  ) {
    await requireVariantsEnabled(tenantId)
    await ownedItem(tenantId, itemId, sourceAppId)
    if (await items.variants.hasConversionBlockers(tenantId, itemId))
      throw appError('billing/item-variants-conversion-blocked')

    await unwrap(await items.variants.generate(tenantId, itemId, body))
    return serializeCatalog(
      'item',
      await ownedItem(tenantId, itemId, sourceAppId)
    )
  },

  async update(
    tenantId: string,
    itemId: string,
    variantId: string,
    body: ItemVariantUpdateParams,
    sourceAppId?: string
  ) {
    await requireVariantsEnabled(tenantId)
    await ownedItem(tenantId, itemId, sourceAppId)
    await unwrap(await items.variants.update(tenantId, itemId, variantId, body))
    return retrieveVariant(tenantId, itemId, variantId, sourceAppId)
  },

  async adjustStock(
    tenantId: string,
    itemId: string,
    variantId: string,
    body: ItemStockAdjustmentParams,
    createdBy?: string,
    sourceAppId?: string
  ) {
    await retrieveVariant(tenantId, itemId, variantId, sourceAppId)
    await unwrap(
      await adjustInventory(tenantId, {
        target: { type: 'variant', id: variantId },
        quantity: body.quantity,
        note: body.note,
        createdBy,
      })
    )
    return retrieveVariant(tenantId, itemId, variantId, sourceAppId)
  },

  listMedia,

  async attachMedia(
    tenantId: string,
    itemId: string,
    body: ItemMediaAttachParams,
    variantId?: string,
    sourceAppId?: string
  ) {
    await ownedItem(tenantId, itemId, sourceAppId)
    await unwrap(await items.media.attach(tenantId, itemId, body, variantId))
    return listMedia(tenantId, itemId, variantId, sourceAppId)
  },

  async reorderMedia(
    tenantId: string,
    itemId: string,
    body: ItemMediaReorderParams,
    variantId?: string,
    sourceAppId?: string
  ) {
    await ownedItem(tenantId, itemId, sourceAppId)
    await unwrap(await items.media.reorder(tenantId, itemId, body, variantId))
    return listMedia(tenantId, itemId, variantId, sourceAppId)
  },

  async removeMedia(
    tenantId: string,
    itemId: string,
    fileId: string,
    variantId?: string,
    sourceAppId?: string
  ) {
    await ownedItem(tenantId, itemId, sourceAppId)
    await unwrap(await items.media.remove(tenantId, itemId, fileId, variantId))
    return { object: 'item_media', id: fileId, deleted: true as const }
  },
}
