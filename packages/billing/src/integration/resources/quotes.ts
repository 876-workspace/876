import {
  BillingInvoiceSchema,
  BillingQuoteListSchema,
  BillingQuoteSchema,
} from '../schemas'
import { IntegrationRequest } from '../request'
import type { IntegrationRuntime } from '../runtime'
import type {
  BillingInvoice,
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

function lifecyclePath(
  organizationId: string,
  quoteId: string,
  action: string
): string {
  return `${resourcePath(organizationId, quoteId)}/${action}`
}

/** `$876.billing.quotes.*` — shared finance quote integrations. */
export function createIntegrationQuotesResource(runtime: IntegrationRuntime) {
  const transition = (
    organizationId: string,
    quoteId: string,
    action: 'send' | 'accept' | 'decline' | 'cancel' | 'expire'
  ) =>
    IntegrationRequest<BillingQuote>(
      runtime,
      {
        method: 'POST',
        path: lifecyclePath(organizationId, quoteId, action),
        body: {},
      },
      BillingQuoteSchema
    )

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

    send(organizationId: string, quoteId: string) {
      return transition(organizationId, quoteId, 'send')
    },

    accept(organizationId: string, quoteId: string) {
      return transition(organizationId, quoteId, 'accept')
    },

    decline(organizationId: string, quoteId: string) {
      return transition(organizationId, quoteId, 'decline')
    },

    cancel(organizationId: string, quoteId: string) {
      return transition(organizationId, quoteId, 'cancel')
    },

    expire(organizationId: string, quoteId: string) {
      return transition(organizationId, quoteId, 'expire')
    },

    convertToInvoice(organizationId: string, quoteId: string) {
      return IntegrationRequest<BillingInvoice>(
        runtime,
        {
          method: 'POST',
          path: lifecyclePath(organizationId, quoteId, 'convert-to-invoice'),
          body: {},
        },
        BillingInvoiceSchema
      )
    },
  }
}
