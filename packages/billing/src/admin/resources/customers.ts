import { AdminRequest } from '../request'
import type { AdminRuntime } from '../runtime'
import { createdResourceSchema } from '../../schemas'
import type { CustomerEnsureParams, Ensured } from '../types'

/** `$876.billing.customers.*` — secret-service customer synchronization. */
export function createAdminCustomersResource(runtime: AdminRuntime) {
  return {
    create(params: CustomerEnsureParams) {
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
