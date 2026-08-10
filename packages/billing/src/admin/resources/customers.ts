import { AdminRequest } from '../request'
import type { AdminRuntime } from '../runtime'
import { createdResourceSchema } from '../../schemas'
import type { CreatedResource, CustomerCreateParams } from '../types'

/** `$876.billing.customers.*` — secret-service customer synchronization. Idempotent create via `organizationId`/`userId`/`externalReference`. */
export function createAdminCustomersResource(runtime: AdminRuntime) {
  return {
    /**
     * Idempotent create: same stable `organizationId`/`userId` with compatible payload returns existing customer.
     * Backing endpoint remains `/ensure` as internal idempotency implementation.
     */
    create(params: CustomerCreateParams) {
      return AdminRequest<CreatedResource<'customer'>>(
        runtime,
        {
          method: 'POST',
          path: '/api/v1/admin/customers/ensure',
          body: params,
        },
        createdResourceSchema('customer')
      )
    },
  }
}
