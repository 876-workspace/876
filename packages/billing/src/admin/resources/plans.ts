import { AdminRequest } from '../request'
import type { AdminRuntime } from '../runtime'
import { createdResourceSchema } from '../../schemas'
import type { CreatedResource, PlanCreateParams } from '../types'

/** `$876.billing.plans.*` — secret-service plan synchronization. Idempotent create via `entitlementReferenceId`. */
export function createAdminPlansResource(runtime: AdminRuntime) {
  return {
    /**
     * Idempotent create: same `entitlementReferenceId`+`productId` with compatible payload returns existing plan; new reference creates.
     * Backing endpoint remains `/ensure` as internal idempotency implementation.
     */
    create(params: PlanCreateParams) {
      return AdminRequest<CreatedResource<'plan'>>(
        runtime,
        {
          method: 'POST',
          path: '/api/v1/admin/plans/ensure',
          body: params,
        },
        createdResourceSchema('plan')
      )
    },
  }
}
