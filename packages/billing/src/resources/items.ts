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

/** `$876.billing.items.*` — tenant-scoped invoice item operations. */
export function createItemsResource(runtime: Runtime) {
  return {
    list(params: BillingItemListParams = {}, options?: RequestOptions) {
      return Request<BillingItemList>(
        runtime,
        {
          method: 'GET',
          path: '/api/v1/items',
          query: { active: params.active },
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
      return Request<BillingItem>(
        runtime,
        {
          method: 'POST',
          path: '/api/v1/items',
          body: params,
          signal: options?.signal,
        },
        BillingItemSchema
      )
    },

    update(
      itemId: string,
      params: BillingItemUpdateParams,
      options?: RequestOptions
    ) {
      return Request<BillingItem>(
        runtime,
        {
          method: 'PATCH',
          path: `/api/v1/items/${encodeURIComponent(itemId)}`,
          body: params,
          signal: options?.signal,
        },
        BillingItemSchema
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
