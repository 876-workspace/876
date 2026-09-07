import { z } from 'zod'

import {
  BillingItemListSchema,
  BillingItemSchema,
  DeletedBillingItemSchema,
} from '../schemas'
import { IntegrationRequest } from '../request'
import type { IntegrationRuntime } from '../runtime'
import type {
  BillingItem,
  BillingItemCreateParams,
  BillingItemList,
  BillingItemListParams,
  BillingItemStockAdjustmentParams,
  BillingItemUpdateParams,
  DeletedBillingItem,
  IntegrationCreateOptions,
} from '../types'

const itemMutationSchema = z.strictObject({
  object: z.literal('item'),
  id: z.string().min(1),
})

function collectionPath(organizationId: string): string {
  return `/api/v1/integrations/organizations/${encodeURIComponent(organizationId)}/items`
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
        {
          method: 'GET',
          path: `${collectionPath(organizationId)}/${encodeURIComponent(itemId)}`,
        },
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
          path: `${collectionPath(organizationId)}/${encodeURIComponent(itemId)}`,
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
          path: `${collectionPath(organizationId)}/${encodeURIComponent(itemId)}/stock-adjustments`,
          body: params,
        },
        BillingItemSchema
      )
    },

    delete(organizationId: string, itemId: string) {
      return IntegrationRequest<DeletedBillingItem>(
        runtime,
        {
          method: 'DELETE',
          path: `${collectionPath(organizationId)}/${encodeURIComponent(itemId)}`,
        },
        DeletedBillingItemSchema
      )
    },
  }
}
