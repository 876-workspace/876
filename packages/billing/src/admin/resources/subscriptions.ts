import { AdminRequest } from '../request'
import type { AdminRuntime } from '../runtime'
import { createdResourceSchema } from '../../schemas'
import type { Ensured, SubscriptionEnsureParams } from '../types'

/** `$billing.subscriptions.*` — secret-service subscription synchronization. */
export function createAdminSubscriptionsResource(runtime: AdminRuntime) {
  return {
    /** Idempotently ensures a core commercial agreement in Billing. */
    ensure(params: SubscriptionEnsureParams) {
      return AdminRequest<Ensured<'subscription'>>(
        runtime,
        {
          method: 'POST',
          path: '/api/v1/admin/subscriptions/ensure',
          body: params,
        },
        createdResourceSchema('subscription')
      )
    },
  }
}
