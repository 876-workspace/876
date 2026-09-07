import { Request } from '../request'
import type { Runtime } from '../runtime'
import {
  CurrencyCreatedSchema,
  CurrencyListSchema,
  CurrencyMutationSchema,
} from '../schemas'
import type {
  Currency,
  CurrencyCreated,
  CurrencyEnableParams,
  CurrencyMutation,
  List,
  RequestOptions,
} from '../types'

/** `$876.billing.currencies.*` - tenant currencies enabled for financial records. */
export function createCurrenciesResource(runtime: Runtime) {
  return {
    list(options?: RequestOptions) {
      return Request<List<Currency>>(
        runtime,
        { method: 'GET', path: '/api/v1/currencies', signal: options?.signal },
        CurrencyListSchema
      )
    },
    enable(params: CurrencyEnableParams, options?: RequestOptions) {
      return Request<CurrencyCreated>(
        runtime,
        {
          method: 'POST',
          path: '/api/v1/currencies',
          body: params,
          signal: options?.signal,
        },
        CurrencyCreatedSchema
      )
    },
    disable(currencyCode: string, options?: RequestOptions) {
      return Request<CurrencyMutation>(
        runtime,
        {
          method: 'DELETE',
          path: `/api/v1/currencies/${encodeURIComponent(currencyCode)}`,
          signal: options?.signal,
        },
        CurrencyMutationSchema
      )
    },
    setDefault(params: CurrencyEnableParams, options?: RequestOptions) {
      return Request<CurrencyMutation>(
        runtime,
        {
          method: 'PATCH',
          path: '/api/v1/currencies',
          body: params,
          signal: options?.signal,
        },
        CurrencyMutationSchema
      )
    },
  }
}
