import { Request } from '../request'
import type { Runtime } from '../runtime'
import {
  DeletedQuoteSchema,
  InvoiceSchema,
  QuoteListSchema,
  QuoteSchema,
} from '../schemas'
import { QuotePreferenceSchema } from '../types/quote-preference.schema'
import type {
  DeletedQuote,
  Invoice,
  Quote,
  QuoteCreateParams,
  QuoteList,
  QuoteListParams,
  QuoteUpdateParams,
  RequestOptions,
} from '../types'
import type {
  QuotePreference,
  QuotePreferenceUpdateParams,
} from '../types/quote-preference'

function resourcePath(quoteId: string) {
  return `/api/v1/quotes/${encodeURIComponent(quoteId)}`
}

function lifecyclePath(quoteId: string, action: string) {
  return `${resourcePath(quoteId)}/${action}`
}

/** `$876.billing.quotes.*` — tenant-scoped shared finance quote operations. */
export function createQuotesResource(runtime: Runtime) {
  const transition = (
    quoteId: string,
    action: 'send' | 'accept' | 'decline' | 'cancel' | 'expire',
    options?: RequestOptions
  ) =>
    Request<Quote>(
      runtime,
      {
        method: 'POST',
        path: lifecyclePath(quoteId, action),
        body: {},
        signal: options?.signal,
      },
      QuoteSchema
    )

  return {
    /** Creates a draft quote in the active Billing workspace. */
    create(params: QuoteCreateParams, options?: RequestOptions) {
      return Request<Quote>(
        runtime,
        {
          method: 'POST',
          path: '/api/v1/quotes',
          body: params,
          signal: options?.signal,
        },
        QuoteSchema
      )
    },

    /** Lists quotes in the active Billing workspace. */
    list(params: QuoteListParams = {}, options?: RequestOptions) {
      return Request<QuoteList>(
        runtime,
        {
          method: 'GET',
          path: '/api/v1/quotes',
          query: params as Record<string, string | number | boolean | undefined>,
          signal: options?.signal,
        },
        QuoteListSchema
      )
    },

    /** Retrieves a single quote by ID. */
    retrieve(quoteId: string, options?: RequestOptions) {
      return Request<Quote>(
        runtime,
        {
          method: 'GET',
          path: resourcePath(quoteId),
          signal: options?.signal,
        },
        QuoteSchema
      )
    },

    /** Updates a draft quote. */
    update(
      quoteId: string,
      params: QuoteUpdateParams,
      options?: RequestOptions
    ) {
      return Request<Quote>(
        runtime,
        {
          method: 'PATCH',
          path: resourcePath(quoteId),
          body: params,
          signal: options?.signal,
        },
        QuoteSchema
      )
    },

    /** Deletes a draft quote. */
    delete(quoteId: string, options?: RequestOptions) {
      return Request<DeletedQuote>(
        runtime,
        {
          method: 'DELETE',
          path: resourcePath(quoteId),
          signal: options?.signal,
        },
        DeletedQuoteSchema
      )
    },

    send(quoteId: string, options?: RequestOptions) {
      return transition(quoteId, 'send', options)
    },

    accept(quoteId: string, options?: RequestOptions) {
      return transition(quoteId, 'accept', options)
    },

    decline(quoteId: string, options?: RequestOptions) {
      return transition(quoteId, 'decline', options)
    },

    cancel(quoteId: string, options?: RequestOptions) {
      return transition(quoteId, 'cancel', options)
    },

    expire(quoteId: string, options?: RequestOptions) {
      return transition(quoteId, 'expire', options)
    },

    convertToInvoice(quoteId: string, options?: RequestOptions) {
      return Request<Invoice>(
        runtime,
        {
          method: 'POST',
          path: lifecyclePath(quoteId, 'convert-to-invoice'),
          body: {},
          signal: options?.signal,
        },
        InvoiceSchema
      )
    },

    getPreferences(options?: RequestOptions) {
      return Request<QuotePreference>(
        runtime,
        {
          method: 'GET',
          path: '/api/v1/quote-preferences',
          signal: options?.signal,
        },
        QuotePreferenceSchema
      )
    },

    updatePreferences(
      params: QuotePreferenceUpdateParams,
      options?: RequestOptions
    ) {
      return Request<QuotePreference>(
        runtime,
        {
          method: 'PATCH',
          path: '/api/v1/quote-preferences',
          body: params,
          signal: options?.signal,
        },
        QuotePreferenceSchema
      )
    },
  }
}
