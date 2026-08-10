import { AdminRequest } from '../request'
import type { AdminRuntime } from '../runtime'
import { createdResourceSchema } from '../../schemas'
import type { CreatedResource, PriceCreateParams } from '../types'

/** `$876.billing.prices.*` — secret-service price synchronization. Idempotent create via `entitlementReferenceId`. */
export function createAdminPricesResource(runtime: AdminRuntime) {
  return {
    /**
     * Idempotent create: same `entitlementReferenceId`+`planId` with compatible payload returns existing price.
     * Backing endpoint remains `/ensure` as internal idempotency implementation.
     */
    create(params: PriceCreateParams) {
      return AdminRequest<CreatedResource<'price'>>(
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
