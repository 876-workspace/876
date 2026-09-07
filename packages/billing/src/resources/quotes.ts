import { Request } from '../request'
import type { Runtime } from '../runtime'
import { DeletedQuoteSchema, QuoteListSchema, QuoteSchema } from '../schemas'
import type {
  DeletedQuote,
  Quote,
  QuoteCreateParams,
  QuoteList,
  QuoteListParams,
  QuoteUpdateParams,
  RequestOptions,
} from '../types'

/** `$876.billing.quotes.*` — tenant-scoped quote operations. */
export function createQuotesResource(runtime: Runtime) {
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
          query: params as Record<
            string,
            string | number | boolean | undefined
          >,
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
          path: `/api/v1/quotes/${encodeURIComponent(quoteId)}`,
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
          path: `/api/v1/quotes/${encodeURIComponent(quoteId)}`,
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
          path: `/api/v1/quotes/${encodeURIComponent(quoteId)}`,
          signal: options?.signal,
        },
        DeletedQuoteSchema
      )
    },
    send(quoteId: string, options?: RequestOptions) {
      return Request(
        runtime,
        {
          method: 'POST',
          path: `/api/v1/quotes/${encodeURIComponent(quoteId)}/send`,
          body: {},
          signal: options?.signal,
        },
        QuoteSchema
      )
    },
    accept(quoteId: string, options?: RequestOptions) {
      return Request(
        runtime,
        {
          method: 'POST',
          path: `/api/v1/quotes/${encodeURIComponent(quoteId)}/accept`,
          body: {},
          signal: options?.signal,
        },
        QuoteSchema
      )
    },
    decline(quoteId: string, options?: RequestOptions) {
      return Request(
        runtime,
        {
          method: 'POST',
          path: `/api/v1/quotes/${encodeURIComponent(quoteId)}/decline`,
          body: {},
          signal: options?.signal,
        },
        QuoteSchema
      )
    },
    cancel(quoteId: string, options?: RequestOptions) {
      return Request(
        runtime,
        {
          method: 'POST',
          path: `/api/v1/quotes/${encodeURIComponent(quoteId)}/cancel`,
          body: {},
          signal: options?.signal,
        },
        QuoteSchema
      )
    },
  }
}
