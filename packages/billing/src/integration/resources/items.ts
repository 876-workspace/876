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
  BillingItemUpdateParams,
  DeletedBillingItem,
  IntegrationCreateOptions,
} from '../types'

function collectionPath(organizationId: string): string {
  return `/api/v1/integrations/organizations/${encodeURIComponent(organizationId)}/items`
}

/** `$billing.items.*` — shared finance catalog integrations. */
export function createIntegrationItemsResource(runtime: IntegrationRuntime) {
  return {
    list(organizationId: string, params: BillingItemListParams = {}) {
      return IntegrationRequest<BillingItemList>(
        runtime,
        {
          method: 'GET',
          path: collectionPath(organizationId),
          query: { active: params.active },
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
      return IntegrationRequest<BillingItem>(
        runtime,
        {
          method: 'POST',
          path: collectionPath(organizationId),
          body: params,
          headers: { 'Idempotency-Key': options.idempotencyKey },
        },
        BillingItemSchema
      )
    },

    update(
      organizationId: string,
      itemId: string,
      params: BillingItemUpdateParams
    ) {
      return IntegrationRequest<BillingItem>(
        runtime,
        {
          method: 'PATCH',
          path: `${collectionPath(organizationId)}/${encodeURIComponent(itemId)}`,
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
