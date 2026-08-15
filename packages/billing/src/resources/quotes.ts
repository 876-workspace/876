import { Request } from '../request'
import type { Runtime } from '../runtime'
import { EstimateListSchema, QuoteListSchema } from '../schemas'
import type {
  EstimateList,
  EstimateListParams,
  QuoteList,
  QuoteListParams,
  RequestOptions,
} from '../types'

/** `$876.billing.quotes.*` — tenant-scoped quote operations. */
export function createQuotesResource(runtime: Runtime) {
  return {
    /** Lists quotes in the active Billing workspace. */
    list(params: QuoteListParams = {}, options?: RequestOptions) {
      return Request<QuoteList>(
        runtime,
        {
          method: 'GET',
          path: '/api/v1/quotes',
          query: params as Record<
            string,
            string | number | boolean | undefined
          >,
          signal: options?.signal,
        },
        QuoteListSchema
      )
    },
  }
}

/** `$876.billing.estimates.*` — tenant-scoped estimate operations. */
export function createEstimatesResource(runtime: Runtime) {
  return {
    /** Lists estimates in the active Billing workspace. */
    list(params: EstimateListParams = {}, options?: RequestOptions) {
      return Request<EstimateList>(
        runtime,
        {
          method: 'GET',
          path: '/api/v1/estimates',
          query: params as Record<
            string,
            string | number | boolean | undefined
          >,
          signal: options?.signal,
        },
        EstimateListSchema
      )
    },
  }
}
