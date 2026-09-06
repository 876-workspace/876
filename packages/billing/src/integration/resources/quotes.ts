import { BillingQuoteListSchema, BillingQuoteSchema } from '../schemas'
import { IntegrationRequest } from '../request'
import type { IntegrationRuntime } from '../runtime'
import type {
  BillingQuote,
  BillingQuoteCreateParams,
  BillingQuoteList,
  BillingQuoteListParams,
  IntegrationCreateOptions,
} from '../types'

function collectionPath(organizationId: string): string {
  return `/api/v1/integrations/organizations/${encodeURIComponent(organizationId)}/quotes`
}

function resourcePath(organizationId: string, quoteId: string): string {
  return `${collectionPath(organizationId)}/${encodeURIComponent(quoteId)}`
}

/** `$876.billing.quotes.*` — shared finance quote integrations. */
export function createIntegrationQuotesResource(runtime: IntegrationRuntime) {
  return {
    list(organizationId: string, params: BillingQuoteListParams = {}) {
      return IntegrationRequest<BillingQuoteList>(
        runtime,
        {
          method: 'GET',
          path: collectionPath(organizationId),
          query: { status: params.status },
        },
        BillingQuoteListSchema
      )
    },

    retrieve(organizationId: string, quoteId: string) {
      return IntegrationRequest<BillingQuote>(
        runtime,
        { method: 'GET', path: resourcePath(organizationId, quoteId) },
        BillingQuoteSchema
      )
    },

    create(
      organizationId: string,
      params: BillingQuoteCreateParams,
      options: IntegrationCreateOptions
    ) {
      return IntegrationRequest<BillingQuote>(
        runtime,
        {
          method: 'POST',
          path: collectionPath(organizationId),
          body: params,
          headers: { 'Idempotency-Key': options.idempotencyKey },
        },
        BillingQuoteSchema
      )
    },
  }
}
