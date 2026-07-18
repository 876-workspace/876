import { AdminRequest } from '../request'
import type { AdminRuntime } from '../runtime'
import { createdResourceSchema } from '../../schemas'
import type { Ensured, PlanEnsureParams } from '../types'

/** `$billing.plans.*` — secret-service plan synchronization. */
export function createAdminPlansResource(runtime: AdminRuntime) {
  return {
    /** Idempotently ensures a core plan tier and cadence in Billing. */
    ensure(params: PlanEnsureParams) {
      return AdminRequest<Ensured<'plan'>>(
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
