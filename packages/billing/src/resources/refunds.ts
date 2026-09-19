import { Request } from '../request'
import type { Runtime } from '../runtime'
import { RefundCreatedSchema, RefundListSchema } from '../schemas'
import type {
  RefundCreated,
  RefundCreateParams,
  RefundList,
  RequestOptions,
} from '../types'

/**
 * `$876.billing.refunds.*` — tenant-scoped refund operations.
 *
 * Refunds are immutable once issued: the Billing API serves list and create
 * only (`GET /api/v1/refunds`, `POST /api/v1/refunds`). There is deliberately
 * no `retrieve`, `update`, or `delete`.
 */
export function createRefundsResource(runtime: Runtime) {
  return {
    /** Lists refunds in the active Billing workspace. */
    list(options?: RequestOptions) {
      return Request<RefundList>(
        runtime,
        { method: 'GET', path: '/api/v1/refunds', signal: options?.signal },
        RefundListSchema
      )
    },
    /** Issues a refund against exactly one source: a credit note or a payment. */
    create(params: RefundCreateParams, options?: RequestOptions) {
      return Request<RefundCreated>(
        runtime,
        {
          method: 'POST',
          path: '/api/v1/refunds',
          body: params,
          signal: options?.signal,
        },
        RefundCreatedSchema
      )
    },
  }
}
