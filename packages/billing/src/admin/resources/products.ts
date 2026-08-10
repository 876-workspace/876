import { AdminRequest } from '../request'
import type { AdminRuntime } from '../runtime'
import { createdResourceSchema } from '../../schemas'
import type { CreatedResource, ProductCreateParams } from '../types'

/** `$876.billing.products.*` — secret-service product synchronization. Idempotent create via stable `sourceAppId`/`slug` external reference. */
export function createAdminProductsResource(runtime: AdminRuntime) {
  return {
    /**
     * Idempotent create: same `sourceAppId`+`slug` with compatible payload returns existing resource; incompatible identity yields conflict.
     * Backing endpoint remains `/ensure` as internal idempotency implementation.
     */
    create(params: ProductCreateParams) {
      return AdminRequest<CreatedResource<'product'>>(
        runtime,
        {
          method: 'POST',
          path: '/api/v1/admin/products/ensure',
          body: params,
        },
        createdResourceSchema('product')
      )
    },
  }
}
