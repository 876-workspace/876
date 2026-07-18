import { adminRequest } from '../request'
import type { AdminRuntime } from '../runtime'
import type {
  AdminDeletedProduct,
  AdminListResponse,
  AdminPrice,
  AdminPriceCreateParams,
  AdminProduct,
  AdminProductCreateParams,
  AdminProductModulesReplaceParams,
  AdminProductUpdateParams,
  AdminPriceUpdateParams,
} from '../types'

/** `$876.products.*` — subscription product/price catalog administration. */
export function createAdminProductsResource(runtime: AdminRuntime) {
  return {
    /** Lists products (with their prices), optionally filtered by the app they're scoped to. */
    list(params?: { appId?: string; status?: 'active' | 'archived' }) {
      return adminRequest<AdminListResponse<AdminProduct>>(runtime, {
        method: 'GET',
        path: '/products',
        query: params as Record<string, string | undefined>,
      })
    },

    /** Retrieves a product. */
    retrieve(productId: string) {
      return adminRequest<AdminProduct>(runtime, {
        method: 'GET',
        path: `/products/${productId}`,
      })
    },

    /** Adds a product with its initial price to the catalog. */
    create(params: AdminProductCreateParams) {
      return adminRequest<AdminProduct>(runtime, {
        method: 'POST',
        path: '/products',
        body: params,
      })
    },

    /** Updates a product's display fields or status. */
    update(productId: string, body: AdminProductUpdateParams) {
      return adminRequest<AdminProduct>(runtime, {
        method: 'PATCH',
        path: `/products/${productId}`,
        body,
      })
    },

    /** Replaces the durable application modules included in a plan. */
    replaceModules(productId: string, body: AdminProductModulesReplaceParams) {
      return adminRequest<AdminProduct>(runtime, {
        method: 'PUT',
        path: `/products/${productId}/modules`,
        body,
      })
    },

    /** Archives a product (status -> archived). Existing subscribers keep their subscription item. */
    archive(productId: string) {
      return adminRequest<AdminDeletedProduct>(runtime, {
        method: 'DELETE',
        path: `/products/${productId}`,
      })
    },

    /** Adds an additional price to an existing product (e.g. an annual option). */
    createPrice(productId: string, params: AdminPriceCreateParams) {
      return adminRequest<AdminPrice>(runtime, {
        method: 'POST',
        path: `/products/${productId}/prices`,
        body: params,
      })
    },
    /** Retrieves a price. */
    retrievePrice(productId: string, priceId: string) {
      return adminRequest<AdminPrice>(runtime, {
        method: 'GET',
        path: `/products/${productId}/prices/${priceId}`,
      })
    },

    /** Updates a price. */
    updatePrice(
      productId: string,
      priceId: string,
      body: AdminPriceUpdateParams
    ) {
      return adminRequest<AdminPrice>(runtime, {
        method: 'PATCH',
        path: `/products/${productId}/prices/${priceId}`,
        body,
      })
    },

    /** Archives a price. */
    archivePrice(productId: string, priceId: string) {
      return adminRequest<AdminPrice>(runtime, {
        method: 'DELETE',
        path: `/products/${productId}/prices/${priceId}`,
      })
    },
  }
}
