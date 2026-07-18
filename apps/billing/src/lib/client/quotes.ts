import type {
  QuoteCreated,
  QuoteCreateInput,
  QuoteDeleted,
  QuoteResource,
  QuoteUpdated,
  QuoteUpdateInput,
} from '@/types/quote'

import { request } from './request'

export const create = (params: QuoteCreateInput) =>
  request<QuoteCreated>('/api/v1/quotes', {
    method: 'POST',
    body: JSON.stringify(params),
  })

export const retrieve = (quoteId: string) =>
  request<QuoteResource>(`/api/v1/quotes/${encodeURIComponent(quoteId)}`, {
    method: 'GET',
  })

export const update = (quoteId: string, params: QuoteUpdateInput) =>
  request<QuoteUpdated>(`/api/v1/quotes/${encodeURIComponent(quoteId)}`, {
    method: 'PATCH',
    body: JSON.stringify(params),
  })

const deleteQuote = (quoteId: string) =>
  request<QuoteDeleted>(`/api/v1/quotes/${encodeURIComponent(quoteId)}`, {
    method: 'DELETE',
  })

export const quotes = {
  create,
  retrieve,
  update,
  delete: deleteQuote,
}
