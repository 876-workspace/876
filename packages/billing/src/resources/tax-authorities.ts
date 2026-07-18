import { Request } from '../request'
import type { Runtime } from '../runtime'
import { TaxAuthorityCreatedSchema, TaxAuthorityListSchema } from '../schemas'
import type {
  List,
  RequestOptions,
  TaxAuthority,
  TaxAuthorityCreated,
  TaxAuthorityCreateParams,
  TaxAuthorityUpdateParams,
} from '../types'

export function createTaxAuthoritiesResource(runtime: Runtime) {
  return {
    list(options?: RequestOptions) {
      return Request<List<TaxAuthority>>(
        runtime,
        {
          method: 'GET',
          path: '/api/v1/tax-authorities',
          signal: options?.signal,
        },
        TaxAuthorityListSchema
      )
    },
    create(params: TaxAuthorityCreateParams, options?: RequestOptions) {
      return Request<TaxAuthorityCreated>(
        runtime,
        {
          method: 'POST',
          path: '/api/v1/tax-authorities',
          body: params,
          signal: options?.signal,
        },
        TaxAuthorityCreatedSchema
      )
    },
    update(
      authorityId: string,
      params: TaxAuthorityUpdateParams,
      options?: RequestOptions
    ) {
      return Request<TaxAuthorityCreated>(
        runtime,
        {
          method: 'PATCH',
          path: `/api/v1/tax-authorities/${encodeURIComponent(authorityId)}`,
          body: params,
          signal: options?.signal,
        },
        TaxAuthorityCreatedSchema
      )
    },
  }
}
