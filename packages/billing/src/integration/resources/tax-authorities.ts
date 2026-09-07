import type {
  TaxAuthority,
  TaxAuthorityCreateParams,
  TaxAuthorityUpdateParams,
} from '../../types'
import { TaxAuthorityListSchema, TaxAuthoritySchema } from '../schemas'
import { IntegrationRequest } from '../request'
import type { IntegrationRuntime } from '../runtime'

type TaxAuthorityList = {
  object: 'list'
  data: TaxAuthority[]
  has_more: boolean
  total_count: number | null
  url: string
}

function collectionPath(organizationId: string): string {
  return `/api/v1/integrations/organizations/${encodeURIComponent(organizationId)}/tax-authorities`
}

export function createIntegrationTaxAuthoritiesResource(
  runtime: IntegrationRuntime
) {
  return {
    list(organizationId: string) {
      return IntegrationRequest<TaxAuthorityList>(
        runtime,
        { method: 'GET', path: collectionPath(organizationId) },
        TaxAuthorityListSchema
      )
    },
    create(organizationId: string, params: TaxAuthorityCreateParams) {
      return IntegrationRequest<TaxAuthority>(
        runtime,
        { method: 'POST', path: collectionPath(organizationId), body: params },
        TaxAuthoritySchema
      )
    },
    update(
      organizationId: string,
      taxAuthorityId: string,
      params: TaxAuthorityUpdateParams
    ) {
      return IntegrationRequest<TaxAuthority>(
        runtime,
        {
          method: 'PATCH',
          path: `${collectionPath(organizationId)}/${encodeURIComponent(taxAuthorityId)}`,
          body: params,
        },
        TaxAuthoritySchema
      )
    },
  }
}
