import { adminRequest } from '../request'
import type { AdminRuntime } from '../runtime'
import type {
  AdminAddress,
  AdminAddressCreateParams,
  AdminAddressUpdateParams,
  AdminDeletedAddress,
  AdminListResponse,
} from '../types'

/** `$876.addresses.*` — platform-wide address administration. */
export function createAdminAddressesResource(runtime: AdminRuntime) {
  return {
    list(params: { userId?: string; organizationId?: string }) {
      return adminRequest<AdminListResponse<AdminAddress>>(runtime, {
        method: 'GET',
        path: '/addresses',
        query: params as Record<string, string | number | undefined>,
      })
    },

    create(params: AdminAddressCreateParams) {
      return adminRequest<AdminAddress>(runtime, {
        method: 'POST',
        path: '/addresses',
        body: params,
      })
    },

    retrieve(addressId: string) {
      return adminRequest<AdminAddress>(runtime, {
        method: 'GET',
        path: `/addresses/${addressId}`,
      })
    },

    update(addressId: string, params: AdminAddressUpdateParams) {
      return adminRequest<AdminAddress>(runtime, {
        method: 'PATCH',
        path: `/addresses/${addressId}`,
        body: params,
      })
    },

    delete(addressId: string) {
      return adminRequest<AdminDeletedAddress>(runtime, {
        method: 'DELETE',
        path: `/addresses/${addressId}`,
      })
    },
  }
}
