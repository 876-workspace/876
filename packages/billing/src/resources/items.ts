import { z } from 'zod'

import { Request } from '../request'
import type { Runtime } from '../runtime'
import {
  BillingItemListSchema,
  BillingItemMediaListSchema,
  BillingItemPreferencesSchema,
  BillingItemSchema,
  BillingItemVariantListSchema,
  BillingItemVariantSchema,
  DeletedBillingItemMediaSchema,
  DeletedBillingItemSchema,
} from '../integration/types'
import type {
  BillingItem,
  BillingItemCreateParams,
  BillingItemList,
  BillingItemListParams,
  BillingItemMediaAttachParams,
  BillingItemMediaList,
  BillingItemMediaReorderParams,
  BillingItemPreferences,
  BillingItemPreferencesUpdateParams,
  BillingItemStockAdjustmentParams,
  BillingItemUpdateParams,
  BillingItemVariant,
  BillingItemVariantGenerateParams,
  BillingItemVariantList,
  BillingItemVariantListParams,
  BillingItemVariantUpdateParams,
  DeletedBillingItem,
  DeletedBillingItemMedia,
} from '../integration/types'
import type { RequestOptions } from '../types'

interface ItemMutationResult {
  object: 'item'
  id: string
}

const ItemMutationSchema = z.strictObject({
  object: z.literal('item'),
  id: z.string().min(1),
}) satisfies z.ZodType<ItemMutationResult>

function itemPath(itemId: string) {
  return `/api/v1/items/${encodeURIComponent(itemId)}`
}

function variantPath(itemId: string, variantId: string) {
  return `${itemPath(itemId)}/variants/${encodeURIComponent(variantId)}`
}

/** `$876.billing.items.*` — tenant-scoped shared finance Item operations. */
export function createItemsResource(runtime: Runtime) {
  return {
    list(params: BillingItemListParams = {}, options?: RequestOptions) {
      return Request<BillingItemList>(
        runtime,
        {
          method: 'GET',
          path: '/api/v1/items',
          query: { active: params.active, q: params.q, limit: params.limit },
          signal: options?.signal,
        },
        BillingItemListSchema
      )
    },

    retrieve(itemId: string, options?: RequestOptions) {
      return Request<BillingItem>(
        runtime,
        {
          method: 'GET',
          path: itemPath(itemId),
          signal: options?.signal,
        },
        BillingItemSchema
      )
    },

    create(params: BillingItemCreateParams, options?: RequestOptions) {
      return Request<ItemMutationResult>(
        runtime,
        {
          method: 'POST',
          path: '/api/v1/items',
          body: params,
          signal: options?.signal,
        },
        ItemMutationSchema
      )
    },

    update(
      itemId: string,
      params: BillingItemUpdateParams,
      options?: RequestOptions
    ) {
      return Request<ItemMutationResult>(
        runtime,
        {
          method: 'PATCH',
          path: itemPath(itemId),
          body: params,
          signal: options?.signal,
        },
        ItemMutationSchema
      )
    },

    adjustStock(
      itemId: string,
      params: BillingItemStockAdjustmentParams,
      options?: RequestOptions
    ) {
      return Request<BillingItem>(
        runtime,
        {
          method: 'POST',
          path: `${itemPath(itemId)}/stock-adjustments`,
          body: params,
          signal: options?.signal,
        },
        BillingItemSchema
      )
    },

    getPreferences(options?: RequestOptions) {
      return Request<BillingItemPreferences>(
        runtime,
        {
          method: 'GET',
          path: '/api/v1/item-preferences',
          signal: options?.signal,
        },
        BillingItemPreferencesSchema
      )
    },

    updatePreferences(
      params: BillingItemPreferencesUpdateParams,
      options?: RequestOptions
    ) {
      return Request<BillingItemPreferences>(
        runtime,
        {
          method: 'PATCH',
          path: '/api/v1/item-preferences',
          body: params,
          signal: options?.signal,
        },
        BillingItemPreferencesSchema
      )
    },

    listVariants(
      itemId: string,
      params: Pick<BillingItemVariantListParams, 'active'> = {},
      options?: RequestOptions
    ) {
      return Request<BillingItemVariantList>(
        runtime,
        {
          method: 'GET',
          path: `${itemPath(itemId)}/variants`,
          query: { active: params.active },
          signal: options?.signal,
        },
        BillingItemVariantListSchema
      )
    },

    searchVariants(
      params: BillingItemVariantListParams = {},
      options?: RequestOptions
    ) {
      return Request<BillingItemVariantList>(
        runtime,
        {
          method: 'GET',
          path: '/api/v1/item-variants',
          query: { active: params.active, q: params.q, limit: params.limit },
          signal: options?.signal,
        },
        BillingItemVariantListSchema
      )
    },

    retrieveVariant(
      itemId: string,
      variantId: string,
      options?: RequestOptions
    ) {
      return Request<BillingItemVariant>(
        runtime,
        {
          method: 'GET',
          path: variantPath(itemId, variantId),
          signal: options?.signal,
        },
        BillingItemVariantSchema
      )
    },

    generateVariants(
      itemId: string,
      params: BillingItemVariantGenerateParams,
      options?: RequestOptions
    ) {
      return Request<BillingItem>(
        runtime,
        {
          method: 'POST',
          path: `${itemPath(itemId)}/variants/generate`,
          body: params,
          signal: options?.signal,
        },
        BillingItemSchema
      )
    },

    updateVariant(
      itemId: string,
      variantId: string,
      params: BillingItemVariantUpdateParams,
      options?: RequestOptions
    ) {
      return Request<BillingItemVariant>(
        runtime,
        {
          method: 'PATCH',
          path: variantPath(itemId, variantId),
          body: params,
          signal: options?.signal,
        },
        BillingItemVariantSchema
      )
    },

    adjustVariantStock(
      itemId: string,
      variantId: string,
      params: BillingItemStockAdjustmentParams,
      options?: RequestOptions
    ) {
      return Request<BillingItemVariant>(
        runtime,
        {
          method: 'POST',
          path: `${variantPath(itemId, variantId)}/stock-adjustments`,
          body: params,
          signal: options?.signal,
        },
        BillingItemVariantSchema
      )
    },

    listMedia(itemId: string, options?: RequestOptions) {
      return Request<BillingItemMediaList>(
        runtime,
        {
          method: 'GET',
          path: `${itemPath(itemId)}/media`,
          signal: options?.signal,
        },
        BillingItemMediaListSchema
      )
    },

    attachMedia(
      itemId: string,
      params: BillingItemMediaAttachParams,
      options?: RequestOptions
    ) {
      return Request<BillingItemMediaList>(
        runtime,
        {
          method: 'POST',
          path: `${itemPath(itemId)}/media`,
          body: params,
          signal: options?.signal,
        },
        BillingItemMediaListSchema
      )
    },

    reorderMedia(
      itemId: string,
      params: BillingItemMediaReorderParams,
      options?: RequestOptions
    ) {
      return Request<BillingItemMediaList>(
        runtime,
        {
          method: 'PUT',
          path: `${itemPath(itemId)}/media`,
          body: params,
          signal: options?.signal,
        },
        BillingItemMediaListSchema
      )
    },

    removeMedia(itemId: string, fileId: string, options?: RequestOptions) {
      return Request<DeletedBillingItemMedia>(
        runtime,
        {
          method: 'DELETE',
          path: `${itemPath(itemId)}/media/${encodeURIComponent(fileId)}`,
          signal: options?.signal,
        },
        DeletedBillingItemMediaSchema
      )
    },

    listVariantMedia(
      itemId: string,
      variantId: string,
      options?: RequestOptions
    ) {
      return Request<BillingItemMediaList>(
        runtime,
        {
          method: 'GET',
          path: `${variantPath(itemId, variantId)}/media`,
          signal: options?.signal,
        },
        BillingItemMediaListSchema
      )
    },

    attachVariantMedia(
      itemId: string,
      variantId: string,
      params: BillingItemMediaAttachParams,
      options?: RequestOptions
    ) {
      return Request<BillingItemMediaList>(
        runtime,
        {
          method: 'POST',
          path: `${variantPath(itemId, variantId)}/media`,
          body: params,
          signal: options?.signal,
        },
        BillingItemMediaListSchema
      )
    },

    reorderVariantMedia(
      itemId: string,
      variantId: string,
      params: BillingItemMediaReorderParams,
      options?: RequestOptions
    ) {
      return Request<BillingItemMediaList>(
        runtime,
        {
          method: 'PUT',
          path: `${variantPath(itemId, variantId)}/media`,
          body: params,
          signal: options?.signal,
        },
        BillingItemMediaListSchema
      )
    },

    removeVariantMedia(
      itemId: string,
      variantId: string,
      fileId: string,
      options?: RequestOptions
    ) {
      return Request<DeletedBillingItemMedia>(
        runtime,
        {
          method: 'DELETE',
          path: `${variantPath(itemId, variantId)}/media/${encodeURIComponent(fileId)}`,
          signal: options?.signal,
        },
        DeletedBillingItemMediaSchema
      )
    },

    delete(itemId: string, options?: RequestOptions) {
      return Request<DeletedBillingItem>(
        runtime,
        {
          method: 'DELETE',
          path: itemPath(itemId),
          signal: options?.signal,
        },
        DeletedBillingItemSchema
      )
    },
  }
}
