import { AdminRequest } from '../request'
import type { AdminRuntime } from '../runtime'
import { createdResourceSchema } from '../../schemas'
import type { Ensured, ProductEnsureParams } from '../types'

/** `$billing.products.*` — secret-service product synchronization. */
export function createAdminProductsResource(runtime: AdminRuntime) {
  return {
    /** Idempotently ensures a core application has a Billing product. */
    ensure(params: ProductEnsureParams) {
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
