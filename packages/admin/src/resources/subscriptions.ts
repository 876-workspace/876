import { adminRequest } from '../request'
import type { AdminRuntime } from '../runtime'
import type {
  AdminDeletedSubscription,
  AdminListResponse,
  AdminSubscription,
  AdminSubscriptionCreateParams,
  AdminSubscriptionUpdateParams,
  AdminSubscriptionItem,
  AdminSubscriptionItemCreateParams,
  AdminSubscriptionItemUpdateParams,
  AdminDeletedSubscriptionItem,
} from '../types'

/** `$876.subscriptions.*` — platform administration of subscriptions. */
export function createAdminSubscriptionsResource(runtime: AdminRuntime) {
  return {
    /** Lists all subscriptions. */
    list(params?: { organizationId?: string; appId?: string; limit?: number }) {
      return adminRequest<AdminListResponse<AdminSubscription>>(runtime, {
        method: 'GET',
        path: '/billing/subscriptions',
        query: {
          organization_id: params?.organizationId,
          app_id: params?.appId,
          limit: params?.limit,
        },
      })
    },

    /** Retrieves a specific subscription by ID. */
    retrieve(subscriptionId: string) {
      return adminRequest<AdminSubscription>(runtime, {
        method: 'GET',
        path: `/billing/subscriptions/${subscriptionId}`,
      })
    },

    /** Creates a new subscription. */
    create(params: AdminSubscriptionCreateParams) {
      return adminRequest<AdminSubscription>(runtime, {
        method: 'POST',
        path: '/billing/subscriptions',
        body: params,
      })
    },

    /** Updates a subscription. */
    update(subscriptionId: string, body: AdminSubscriptionUpdateParams) {
      return adminRequest<AdminSubscription>(runtime, {
        method: 'PATCH',
        path: `/billing/subscriptions/${subscriptionId}`,
        body,
      })
    },

    /** Cancels/deletes a subscription. */
    del(subscriptionId: string) {
      return adminRequest<AdminDeletedSubscription>(runtime, {
        method: 'DELETE',
        path: `/billing/subscriptions/${subscriptionId}`,
      })
    },

    /** Adds an item to a subscription. */
    createItem(
      subscriptionId: string,
      params: AdminSubscriptionItemCreateParams
    ) {
      return adminRequest<AdminSubscriptionItem>(runtime, {
        method: 'POST',
        path: `/billing/subscriptions/${subscriptionId}/items`,
        body: params,
      })
    },

    /** Updates a subscription item. */
    updateItem(
      subscriptionId: string,
      itemId: string,
      body: AdminSubscriptionItemUpdateParams
    ) {
      return adminRequest<AdminSubscriptionItem>(runtime, {
        method: 'PATCH',
        path: `/billing/subscriptions/${subscriptionId}/items/${itemId}`,
        body,
      })
    },

    /** Removes a subscription item. */
    deleteItem(subscriptionId: string, itemId: string) {
      return adminRequest<AdminDeletedSubscriptionItem>(runtime, {
        method: 'DELETE',
        path: `/billing/subscriptions/${subscriptionId}/items/${itemId}`,
      })
    },
  }
}
