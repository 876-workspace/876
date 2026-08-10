import { AdminRequest } from '../request'
import type { AdminRuntime } from '../runtime'
import { createdResourceSchema } from '../../schemas'
import type { Ensured, ProductEnsureParams } from '../types'

/** `$876.billing.products.*` — secret-service product synchronization. */
export function createAdminProductsResource(runtime: AdminRuntime) {
  return {
    create(params: ProductEnsureParams) {
      return AdminRequest<Ensured<'product'>>(
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
