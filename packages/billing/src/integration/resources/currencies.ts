import {
  CurrencyCreatedSchema,
  CurrencyListSchema,
  CurrencyMutationSchema,
} from '../../types/currency'
import { IntegrationRequest } from '../request'
import type { IntegrationRuntime } from '../runtime'
import type {
  Currency,
  CurrencyCreated,
  CurrencyEnableParams,
  CurrencyMutation,
  CurrencyUpdateParams,
} from '../../types/currency'
import type { List } from '../../types/common'

function collectionPath(organizationId: string) {
  return `/api/v1/integrations/organizations/${encodeURIComponent(organizationId)}/currencies`
}

/** `$876.billing.currencies.*` — currencies available to a connected app. */
export function createIntegrationCurrenciesResource(
  runtime: IntegrationRuntime
) {
  return {
    list(organizationId: string) {
      return IntegrationRequest<List<Currency>>(
        runtime,
        { method: 'GET', path: collectionPath(organizationId) },
        CurrencyListSchema
      )
    },
    enable(organizationId: string, params: CurrencyEnableParams) {
      return IntegrationRequest<CurrencyCreated>(
        runtime,
        { method: 'POST', path: collectionPath(organizationId), body: params },
        CurrencyCreatedSchema
      )
    },
    update(organizationId: string, code: string, params: CurrencyUpdateParams) {
      return IntegrationRequest<CurrencyMutation>(
        runtime,
        {
          method: 'PATCH',
          path: `${collectionPath(organizationId)}/${encodeURIComponent(code)}`,
          body: params,
        },
        CurrencyMutationSchema
      )
    },
    setDefault(organizationId: string, params: CurrencyEnableParams) {
      return IntegrationRequest<CurrencyMutation>(
        runtime,
        { method: 'PATCH', path: collectionPath(organizationId), body: params },
        CurrencyMutationSchema
      )
    },
    disable(organizationId: string, code: string) {
      return IntegrationRequest<CurrencyMutation>(
        runtime,
        {
          method: 'DELETE',
          path: `${collectionPath(organizationId)}/${encodeURIComponent(code)}`,
        },
        CurrencyMutationSchema
      )
    },
  }
}
