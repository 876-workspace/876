import type {
  DocumentEmailComposition,
  DocumentEmailDelivery,
  DocumentEmailPrepareParams,
  DocumentEmailSendParams,
  QuotePreference,
  QuotePreferenceUpdateParams,
} from '@876/billing'

import type { InvoiceResource } from '@/types/invoice'
import type {
  QuoteCreated,
  QuoteCreateInput,
  QuoteDeleted,
  QuoteResource,
  QuoteUpdated,
  QuoteUpdateInput,
} from '@/types/quote'
import type { SalesOrderResource } from '@/types/sales-order'

import { request } from './request'

function emailPath(quoteId: string) {
  return `/api/v1/quotes/${encodeURIComponent(quoteId)}/email`
}

function prepareEmail(
  quoteId: string,
  params: DocumentEmailPrepareParams = {}
) {
  const search = new URLSearchParams()
  if (params.senderId) search.set('senderId', params.senderId)
  if (params.templateId) search.set('templateId', params.templateId)
  const query = search.size > 0 ? `?${search.toString()}` : ''
  return request<DocumentEmailComposition>(`${emailPath(quoteId)}${query}`, {
    method: 'GET',
  })
}

function sendEmail(quoteId: string, params: DocumentEmailSendParams) {
  return request<DocumentEmailDelivery>(
    `/api/v1/quotes/${encodeURIComponent(quoteId)}/send-email`,
    {
      method: 'POST',
      headers: { 'Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify(params),
    }
  )
}

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

const transition = (
  quoteId: string,
  action: 'send' | 'accept' | 'decline' | 'cancel' | 'expire'
) =>
  request<QuoteResource>(
    `/api/v1/quotes/${encodeURIComponent(quoteId)}/${action}`,
    { method: 'POST', body: JSON.stringify({}) }
  )

const convertToInvoice = (quoteId: string) =>
  request<InvoiceResource>(
    `/api/v1/quotes/${encodeURIComponent(quoteId)}/convert-to-invoice`,
    { method: 'POST', body: JSON.stringify({}) }
  )

const convertToSalesOrder = (quoteId: string) =>
  request<SalesOrderResource>(
    `/api/v1/quotes/${encodeURIComponent(quoteId)}/convert-to-sales-order`,
    { method: 'POST', body: JSON.stringify({}) }
  )

const getPreferences = () =>
  request<QuotePreference>('/api/v1/quote-preferences', { method: 'GET' })

const updatePreferences = (params: QuotePreferenceUpdateParams) =>
  request<QuotePreference>('/api/v1/quote-preferences', {
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
  send: (quoteId: string) => transition(quoteId, 'send'),
  prepareEmail,
  sendEmail,
  accept: (quoteId: string) => transition(quoteId, 'accept'),
  decline: (quoteId: string) => transition(quoteId, 'decline'),
  cancel: (quoteId: string) => transition(quoteId, 'cancel'),
  expire: (quoteId: string) => transition(quoteId, 'expire'),
  convertToInvoice,
  convertToSalesOrder,
  getPreferences,
  updatePreferences,
  delete: deleteQuote,
}
