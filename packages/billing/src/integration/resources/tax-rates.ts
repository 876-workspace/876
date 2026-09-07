import type {
  TaxRate,
  TaxRateCreateParams,
  TaxRateUpdateParams,
} from '../../types'
import { TaxRateListSchema, TaxRateSchema } from '../schemas'
import { IntegrationRequest } from '../request'
import type { IntegrationRuntime } from '../runtime'

type TaxRateList = {
  object: 'list'
  data: TaxRate[]
  has_more: boolean
  total_count: number | null
  url: string
}

function collectionPath(organizationId: string): string {
  return `/api/v1/integrations/organizations/${encodeURIComponent(organizationId)}/tax-rates`
}

export function createIntegrationTaxRatesResource(runtime: IntegrationRuntime) {
  return {
    list(organizationId: string) {
      return IntegrationRequest<TaxRateList>(
        runtime,
        { method: 'GET', path: collectionPath(organizationId) },
        TaxRateListSchema
      )
    },
    create(organizationId: string, params: TaxRateCreateParams) {
      return IntegrationRequest<TaxRate>(
        runtime,
        { method: 'POST', path: collectionPath(organizationId), body: params },
        TaxRateSchema
      )
    },
    update(
      organizationId: string,
      taxRateId: string,
      params: TaxRateUpdateParams
    ) {
      return IntegrationRequest<TaxRate>(
        runtime,
        {
          method: 'PATCH',
          path: `${collectionPath(organizationId)}/${encodeURIComponent(taxRateId)}`,
          body: params,
        },
        TaxRateSchema
      )
    },
  }
}
