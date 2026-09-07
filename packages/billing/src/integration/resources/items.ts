import { z } from 'zod'

import {
  BillingItemListSchema,
  BillingItemMediaListSchema,
  BillingItemPreferencesSchema,
  BillingItemSchema,
  BillingItemVariantListSchema,
  BillingItemVariantSchema,
  DeletedBillingItemMediaSchema,
  DeletedBillingItemSchema,
} from '../schemas'
import { IntegrationRequest } from '../request'
import type { IntegrationRuntime } from '../runtime'
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
  IntegrationCreateOptions,
} from '../types'

const itemMutationSchema = z.strictObject({
  object: z.literal('item'),
  id: z.string().min(1),
})

function collectionPath(organizationId: string): string {
  return `/api/v1/integrations/organizations/${encodeURIComponent(organizationId)}/items`
}

function itemPath(organizationId: string, itemId: string) {
  return `${collectionPath(organizationId)}/${encodeURIComponent(itemId)}`
}

function variantPath(
  organizationId: string,
  itemId: string,
  variantId: string
) {
  return `${itemPath(organizationId, itemId)}/variants/${encodeURIComponent(variantId)}`
}

function preferencesPath(organizationId: string) {
  return `/api/v1/integrations/organizations/${encodeURIComponent(organizationId)}/item-preferences`
}

function variantSearchPath(organizationId: string) {
  return `/api/v1/integrations/organizations/${encodeURIComponent(organizationId)}/item-variants`
}

/** `$876.billing.items.*` — shared finance catalog integrations. */
export function createIntegrationItemsResource(runtime: IntegrationRuntime) {
  return {
    list(organizationId: string, params: BillingItemListParams = {}) {
      return IntegrationRequest<BillingItemList>(
        runtime,
        {
          method: 'GET',
          path: collectionPath(organizationId),
          query: { active: params.active, q: params.q, limit: params.limit },
        },
        BillingItemListSchema
      )
    },

    retrieve(organizationId: string, itemId: string) {
      return IntegrationRequest<BillingItem>(
        runtime,
        { method: 'GET', path: itemPath(organizationId, itemId) },
        BillingItemSchema
      )
    },

    create(
      organizationId: string,
      params: BillingItemCreateParams,
      options: IntegrationCreateOptions
    ) {
      return IntegrationRequest<z.infer<typeof itemMutationSchema>>(
        runtime,
        {
          method: 'POST',
          path: collectionPath(organizationId),
          body: params,
          headers: { 'Idempotency-Key': options.idempotencyKey },
        },
        itemMutationSchema
      )
    },

    update(
      organizationId: string,
      itemId: string,
      params: BillingItemUpdateParams
    ) {
      return IntegrationRequest<z.infer<typeof itemMutationSchema>>(
        runtime,
        {
          method: 'PATCH',
          path: itemPath(organizationId, itemId),
          body: params,
        },
        itemMutationSchema
      )
    },

    adjustStock(
      organizationId: string,
      itemId: string,
      params: BillingItemStockAdjustmentParams
    ) {
      return IntegrationRequest<BillingItem>(
        runtime,
        {
          method: 'POST',
          path: `${itemPath(organizationId, itemId)}/stock-adjustments`,
          body: params,
        },
        BillingItemSchema
      )
    },

    getPreferences(organizationId: string) {
      return IntegrationRequest<BillingItemPreferences>(
        runtime,
        { method: 'GET', path: preferencesPath(organizationId) },
        BillingItemPreferencesSchema
      )
    },

    updatePreferences(
      organizationId: string,
      params: BillingItemPreferencesUpdateParams
    ) {
      return IntegrationRequest<BillingItemPreferences>(
        runtime,
        {
          method: 'PATCH',
          path: preferencesPath(organizationId),
          body: params,
        },
        BillingItemPreferencesSchema
      )
    },

    listVariants(
      organizationId: string,
      itemId: string,
      params: Pick<BillingItemVariantListParams, 'active'> = {}
    ) {
      return IntegrationRequest<BillingItemVariantList>(
        runtime,
        {
          method: 'GET',
          path: `${itemPath(organizationId, itemId)}/variants`,
          query: { active: params.active },
        },
        BillingItemVariantListSchema
      )
    },

    searchVariants(
      organizationId: string,
      params: BillingItemVariantListParams = {}
    ) {
      return IntegrationRequest<BillingItemVariantList>(
        runtime,
        {
          method: 'GET',
          path: variantSearchPath(organizationId),
          query: { active: params.active, q: params.q, limit: params.limit },
        },
        BillingItemVariantListSchema
      )
    },

    retrieveVariant(organizationId: string, itemId: string, variantId: string) {
      return IntegrationRequest<BillingItemVariant>(
        runtime,
        {
          method: 'GET',
          path: variantPath(organizationId, itemId, variantId),
        },
        BillingItemVariantSchema
      )
    },

    generateVariants(
      organizationId: string,
      itemId: string,
      params: BillingItemVariantGenerateParams
    ) {
      return IntegrationRequest<BillingItem>(
        runtime,
        {
          method: 'POST',
          path: `${itemPath(organizationId, itemId)}/variants/generate`,
          body: params,
        },
        BillingItemSchema
      )
    },

    updateVariant(
      organizationId: string,
      itemId: string,
      variantId: string,
      params: BillingItemVariantUpdateParams
    ) {
      return IntegrationRequest<BillingItemVariant>(
        runtime,
        {
          method: 'PATCH',
          path: variantPath(organizationId, itemId, variantId),
          body: params,
        },
        BillingItemVariantSchema
      )
    },

    adjustVariantStock(
      organizationId: string,
      itemId: string,
      variantId: string,
      params: BillingItemStockAdjustmentParams
    ) {
      return IntegrationRequest<BillingItemVariant>(
        runtime,
        {
          method: 'POST',
          path: `${variantPath(organizationId, itemId, variantId)}/stock-adjustments`,
          body: params,
        },
        BillingItemVariantSchema
      )
    },

    listMedia(organizationId: string, itemId: string) {
      return IntegrationRequest<BillingItemMediaList>(
        runtime,
        { method: 'GET', path: `${itemPath(organizationId, itemId)}/media` },
        BillingItemMediaListSchema
      )
    },

    attachMedia(
      organizationId: string,
      itemId: string,
      params: BillingItemMediaAttachParams
    ) {
      return IntegrationRequest<BillingItemMediaList>(
        runtime,
        {
          method: 'POST',
          path: `${itemPath(organizationId, itemId)}/media`,
          body: params,
        },
        BillingItemMediaListSchema
      )
    },

    reorderMedia(
      organizationId: string,
      itemId: string,
      params: BillingItemMediaReorderParams
    ) {
      return IntegrationRequest<BillingItemMediaList>(
        runtime,
        {
          method: 'PUT',
          path: `${itemPath(organizationId, itemId)}/media`,
          body: params,
        },
        BillingItemMediaListSchema
      )
    },

    removeMedia(organizationId: string, itemId: string, fileId: string) {
      return IntegrationRequest<DeletedBillingItemMedia>(
        runtime,
        {
          method: 'DELETE',
          path: `${itemPath(organizationId, itemId)}/media/${encodeURIComponent(fileId)}`,
        },
        DeletedBillingItemMediaSchema
      )
    },

    listVariantMedia(
      organizationId: string,
      itemId: string,
      variantId: string
    ) {
      return IntegrationRequest<BillingItemMediaList>(
        runtime,
        {
          method: 'GET',
          path: `${variantPath(organizationId, itemId, variantId)}/media`,
        },
        BillingItemMediaListSchema
      )
    },

    attachVariantMedia(
      organizationId: string,
      itemId: string,
      variantId: string,
      params: BillingItemMediaAttachParams
    ) {
      return IntegrationRequest<BillingItemMediaList>(
        runtime,
        {
          method: 'POST',
          path: `${variantPath(organizationId, itemId, variantId)}/media`,
          body: params,
        },
        BillingItemMediaListSchema
      )
    },

    reorderVariantMedia(
      organizationId: string,
      itemId: string,
      variantId: string,
      params: BillingItemMediaReorderParams
    ) {
      return IntegrationRequest<BillingItemMediaList>(
        runtime,
        {
          method: 'PUT',
          path: `${variantPath(organizationId, itemId, variantId)}/media`,
          body: params,
        },
        BillingItemMediaListSchema
      )
    },

    removeVariantMedia(
      organizationId: string,
      itemId: string,
      variantId: string,
      fileId: string
    ) {
      return IntegrationRequest<DeletedBillingItemMedia>(
        runtime,
        {
          method: 'DELETE',
          path: `${variantPath(organizationId, itemId, variantId)}/media/${encodeURIComponent(fileId)}`,
        },
        DeletedBillingItemMediaSchema
      )
    },

    delete(organizationId: string, itemId: string) {
      return IntegrationRequest<DeletedBillingItem>(
        runtime,
        { method: 'DELETE', path: itemPath(organizationId, itemId) },
        DeletedBillingItemSchema
      )
    },
  }
}
