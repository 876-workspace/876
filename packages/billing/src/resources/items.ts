import { z } from 'zod'

import { Request } from '../request'
import type { Runtime } from '../runtime'
import {
  BillingItemListSchema,
  BillingItemSchema,
  DeletedBillingItemSchema,
} from '../integration/types'
import type {
  BillingItem,
  BillingItemCreateParams,
  BillingItemList,
  BillingItemListParams,
  BillingItemUpdateParams,
  DeletedBillingItem,
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

/** `$876.billing.items.*` — tenant-scoped invoice item operations. */
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
          path: `/api/v1/items/${encodeURIComponent(itemId)}`,
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
          path: `/api/v1/items/${encodeURIComponent(itemId)}`,
          body: params,
          signal: options?.signal,
        },
        ItemMutationSchema
      )
    },

    delete(itemId: string, options?: RequestOptions) {
      return Request<DeletedBillingItem>(
        runtime,
        {
          method: 'DELETE',
          path: `/api/v1/items/${encodeURIComponent(itemId)}`,
          signal: options?.signal,
        },
        DeletedBillingItemSchema
      )
    },
  }
}
