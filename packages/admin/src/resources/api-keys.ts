import { adminRequest } from '../request'
import type { AdminRuntime } from '../runtime'
import type {
  AdminApiKey,
  AdminApiKeyCreated,
  AdminApiKeyCreateParams,
  AdminApiKeyUpdateParams,
  AdminDeletedApiKey,
  AdminListResponse,
} from '../types'

/** `$876.apiKeys.*` — app API-key administration. */
export function createAdminApiKeysResource(runtime: AdminRuntime) {
  return {
    create(appId: string, params: AdminApiKeyCreateParams = {}) {
      return adminRequest<AdminApiKeyCreated>(runtime, {
        method: 'POST',
        path: `/apps/${appId}/api-keys`,
        body: params,
      })
    },

    list(
      appId: string,
      params?: {
        limit?: number
        starting_after?: string
        ending_before?: string
      }
    ) {
      return adminRequest<AdminListResponse<AdminApiKey>>(runtime, {
        method: 'GET',
        path: `/apps/${appId}/api-keys`,
        query: params as Record<string, string | number | undefined>,
      })
    },

    update(appId: string, keyId: string, params: AdminApiKeyUpdateParams) {
      return adminRequest<AdminApiKey>(runtime, {
        method: 'PATCH',
        path: `/apps/${appId}/api-keys/${keyId}`,
        body: params,
      })
    },

    revoke(appId: string, keyId: string) {
      return adminRequest<AdminApiKey>(runtime, {
        method: 'POST',
        path: `/apps/${appId}/api-keys/${keyId}/revoke`,
      })
    },

    delete(appId: string, keyId: string) {
      return adminRequest<AdminDeletedApiKey>(runtime, {
        method: 'DELETE',
        path: `/apps/${appId}/api-keys/${keyId}`,
      })
    },
  }
}
