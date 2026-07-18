import { AdminRequest } from '../request'
import type { AdminRuntime } from '../runtime'
import { createdResourceSchema } from '../../schemas'
import type { CustomerEnsureParams, Ensured } from '../types'

/** `$billing.customers.*` — secret-service customer synchronization. */
export function createAdminCustomersResource(runtime: AdminRuntime) {
  return {
    /** Idempotently ensures a core organization as a Billing customer. */
    ensure(params: CustomerEnsureParams) {
      return AdminRequest<Ensured<'customer'>>(
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
