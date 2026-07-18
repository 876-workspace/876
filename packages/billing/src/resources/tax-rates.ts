import { Request } from '../request'
import type { Runtime } from '../runtime'
import { TaxRateCreatedSchema, TaxRateListSchema } from '../schemas'
import type {
  List,
  RequestOptions,
  TaxRate,
  TaxRateCreated,
  TaxRateCreateParams,
  TaxRateUpdateParams,
} from '../types'

export function createTaxRatesResource(runtime: Runtime) {
  return {
    list(options?: RequestOptions) {
      return Request<List<TaxRate>>(
        runtime,
        { method: 'GET', path: '/api/v1/tax-rates', signal: options?.signal },
        TaxRateListSchema
      )
    },
    create(params: TaxRateCreateParams, options?: RequestOptions) {
      return Request<TaxRateCreated>(
        runtime,
        {
          method: 'POST',
          path: '/api/v1/tax-rates',
          body: params,
          signal: options?.signal,
        },
        TaxRateCreatedSchema
      )
    },
    update(
      rateId: string,
      params: TaxRateUpdateParams,
      options?: RequestOptions
    ) {
      return Request<TaxRateCreated>(
        runtime,
        {
          method: 'PATCH',
          path: `/api/v1/tax-rates/${encodeURIComponent(rateId)}`,
          body: params,
          signal: options?.signal,
        },
        TaxRateCreatedSchema
      )
    },
  }
}
