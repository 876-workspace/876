import { AdminRequest } from '../request'
import type { AdminRuntime } from '../runtime'
import { createdResourceSchema } from '../../schemas'
import type { CreatedResource, SubscriptionCreateParams } from '../types'

/** `$876.billing.subscriptions.*` — secret-service subscription synchronization. Idempotent create via `externalReference` (core subscription id). */
export function createAdminSubscriptionsResource(runtime: AdminRuntime) {
  return {
    /**
     * Idempotent create: same `externalReference` with compatible payload returns existing subscription.
     * Backing endpoint remains `/ensure` as internal idempotency implementation.
     */
    create(params: SubscriptionCreateParams) {
      return AdminRequest<CreatedResource<'subscription'>>(
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
