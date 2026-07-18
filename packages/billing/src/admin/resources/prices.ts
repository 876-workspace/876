import { AdminRequest } from '../request'
import type { AdminRuntime } from '../runtime'
import { createdResourceSchema } from '../../schemas'
import type { Ensured, PriceEnsureParams } from '../types'

/** `$billing.prices.*` — secret-service price synchronization. */
export function createAdminPricesResource(runtime: AdminRuntime) {
  return {
    /** Idempotently ensures a core price as an immutable Billing price. */
    ensure(params: PriceEnsureParams) {
      return AdminRequest<Ensured<'price'>>(
        runtime,
        {
          method: 'POST',
          path: '/api/v1/admin/prices/ensure',
          body: params,
        },
        createdResourceSchema('price')
      )
    },
  }
}
