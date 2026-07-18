import { adminRequest } from '../request'
import type { AdminRuntime } from '../runtime'
import type {
  AdminApp,
  AdminAppCreated,
  AdminAppCreateParams,
  AdminAppPublic,
  AdminAppStatus,
  AdminAppUpdateParams,
  AdminDeletedApp,
  AdminFeature,
  AdminListResponse,
  AdminSubscription,
} from '../types'

/** `$876.apps.*` — platform-wide registered-app administration. */
export function createAdminAppsResource(runtime: AdminRuntime) {
  return {
    /**
     * Lists apps. When no `organizationId` filter is provided
     * the internal key must be present — returns all registered platform apps.
     */
    list(params?: {
      limit?: number
      starting_after?: string
      ending_before?: string
      organizationId?: string
      /** Filter by app kind (e.g. "internal"). Admin only when no owner/org filter. */
      appKind?: string
      /** Filter by client type (e.g. "public" to exclude service/confidential apps). */
      clientType?: string
      /** Filter by app status. Defaults are owned by the caller. */
      status?: AdminAppStatus
    }) {
      return adminRequest<AdminListResponse<AdminApp>>(runtime, {
        method: 'GET',
        path: '/apps',
        query: params as Record<string, string | number | undefined>,
      })
    },

    /**
     * Registers a new OAuth client (app). Returns the created app and, for
     * confidential clients, the one-time plaintext `clientSecret`.
     */
    create(params: AdminAppCreateParams) {
      return adminRequest<AdminAppCreated>(runtime, {
        method: 'POST',
        path: '/apps',
        body: params,
      })
    },

    /**
     * Retrieves the app associated with this client's `apiKey`.
     */
    current() {
      return adminRequest<AdminApp>(runtime, {
        method: 'GET',
        path: '/apps/current',
      })
    },

    retrieve(appId: string) {
      return adminRequest<AdminApp>(runtime, {
        method: 'GET',
        path: `/apps/${appId}`,
      })
    },

    getPublic(clientId: string) {
      return adminRequest<AdminAppPublic>(runtime, {
        method: 'GET',
        path: `/apps/public/${clientId}`,
      })
    },

    update(appId: string, body: AdminAppUpdateParams) {
      return adminRequest<AdminApp>(runtime, {
        method: 'PATCH',
        path: `/apps/${appId}`,
        body,
      })
    },

    delete(appId: string) {
      return adminRequest<AdminDeletedApp>(runtime, {
        method: 'DELETE',
        path: `/apps/${appId}`,
      })
    },

    features: {
      /** Returns a paginated list of feature flags assigned to this app. */
      list(
        appId: string,
        params?: {
          limit?: number
          starting_after?: string
          ending_before?: string
          rootOnly?: boolean
          includeTag?: string
          excludeTag?: string
        }
      ) {
        return adminRequest<AdminListResponse<AdminFeature>>(runtime, {
          method: 'GET',
          path: `/apps/${appId}/features`,
          query: params as Record<string, string | number | undefined>,
        })
      },
    },

    subscriptions: {
      /** Every org's access/subscription record for this app. */
      list(appId: string) {
        return adminRequest<AdminSubscription[]>(runtime, {
          method: 'GET',
          path: `/apps/${appId}/subscriptions`,
        })
      },
    },
  }
}
