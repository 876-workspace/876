import { adminRequest } from '../request'
import type { AdminRuntime } from '../runtime'
import type {
  AdminPrice,
  AdminPriceCreateParams,
  AdminPriceUpdateParams,
} from '../types'

/** `$876.prices.*` — subscription price catalog administration. */
export function createAdminPricesResource(runtime: AdminRuntime) {
  return {
    /** Adds a price to an existing product. */
    create(productId: string, params: AdminPriceCreateParams) {
      return adminRequest<AdminPrice>(runtime, {
        method: 'POST',
        path: `/products/${productId}/prices`,
        body: params,
      })
    },

    /** Retrieves a price on a product. */
    retrieve(productId: string, priceId: string) {
      return adminRequest<AdminPrice>(runtime, {
        method: 'GET',
        path: `/products/${productId}/prices/${priceId}`,
      })
    },

    /** Updates a price on a product. */
    update(productId: string, priceId: string, body: AdminPriceUpdateParams) {
      return adminRequest<AdminPrice>(runtime, {
        method: 'PATCH',
        path: `/products/${productId}/prices/${priceId}`,
        body,
      })
    },

    /** Archives a price on a product. */
    archive(productId: string, priceId: string) {
      return adminRequest<AdminPrice>(runtime, {
        method: 'DELETE',
        path: `/products/${productId}/prices/${priceId}`,
      })
    },
  }
}
