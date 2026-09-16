'use client'

import type {
  DocumentEmailComposition,
  DocumentEmailDelivery,
  DocumentEmailPrepareParams,
  DocumentEmailSendParams,
} from '@876/billing'

import { request } from './request'

export interface DocumentLineCreateParams {
  itemId?: string | null
  variantId?: string | null
  priceId?: string | null
  description?: string | null
  quantity?: number
  unitAmount?: string | null
  taxAmount?: string
  discountAmount?: string
}

/** Matches Billing's integration invoice-create input using JSON-safe minor units. */
export interface DocumentCreateParams {
  quoteId?: string | null
  customerId?: string | null
  subscriptionId?: string | null
  salespersonId?: string | null
  priceListId?: string | null
  currency?: string
  issueAt?: number
  dueAt?: number
  /** Quotes only. */
  expiresAt?: number
  orderNumber?: string | null
  referenceNumber?: string | null
  subject?: string | null
  taxBehavior?: 'EXCLUSIVE' | 'INCLUSIVE'
  discountAmount?: string
  shippingAmount?: string
  adjustmentAmount?: string
  notes?: string | null
  terms?: string | null
  lines?: DocumentLineCreateParams[]
  sourceExternalReference?: string | null
}

export interface DocumentUpdateParams {
  issueAt?: number | null
  dueAt?: number | null
  expiresAt?: number | null
  notes?: string | null
  terms?: string | null
  orderNumber?: string | null
  referenceNumber?: string | null
  subject?: string | null
  lines?: DocumentLineCreateParams[]
}

interface DocumentCreated {
  object: 'invoice' | 'quote'
  id: string
}

interface DocumentUpdated {
  object: 'invoice' | 'quote'
  id: string
}

interface DocumentDeleted {
  object: 'invoice' | 'quote'
  id: string
  deleted: true
}

type DocumentEndpoint = '/api/invoices' | '/api/quotes'

function commandHeaders() {
  return { 'Idempotency-Key': crypto.randomUUID() }
}

function emailPath(documentId: string, endpoint: DocumentEndpoint) {
  return `${endpoint}/${encodeURIComponent(documentId)}/email`
}

function prepareEmail(
  documentId: string,
  endpoint: DocumentEndpoint,
  params: DocumentEmailPrepareParams = {}
) {
  const search = new URLSearchParams()
  if (params.senderId) search.set('senderId', params.senderId)
  if (params.templateId) search.set('templateId', params.templateId)
  const query = search.size > 0 ? `?${search.toString()}` : ''
  return request<DocumentEmailComposition>(
    `${emailPath(documentId, endpoint)}${query}`,
    { method: 'GET' }
  )
}

function sendEmail(
  documentId: string,
  endpoint: DocumentEndpoint,
  params: DocumentEmailSendParams
) {
  return request<DocumentEmailDelivery>(
    `${endpoint}/${encodeURIComponent(documentId)}/send-email`,
    {
      method: 'POST',
      headers: commandHeaders(),
      body: JSON.stringify(params),
    }
  )
}

export const documents = {
  create(
    params: DocumentCreateParams,
    endpoint: DocumentEndpoint = '/api/invoices'
  ) {
    return request<DocumentCreated>(endpoint, {
      method: 'POST',
      headers: commandHeaders(),
      body: JSON.stringify(params),
    })
  },
  update(invoiceId: string, params: DocumentUpdateParams) {
    return request<DocumentUpdated>(
      `/api/invoices/${encodeURIComponent(invoiceId)}`,
      { method: 'PATCH', body: JSON.stringify(params) }
    )
  },
  updateQuote(quoteId: string, params: DocumentUpdateParams) {
    return request<DocumentUpdated>(
      `/api/quotes/${encodeURIComponent(quoteId)}`,
      { method: 'PATCH', body: JSON.stringify(params) }
    )
  },
  finalize(invoiceId: string) {
    return request<DocumentUpdated>(
      `/api/invoices/${encodeURIComponent(invoiceId)}/finalize`,
      {
        method: 'POST',
        headers: commandHeaders(),
        body: JSON.stringify({ autoApplyCredits: true }),
      }
    )
  },
  send(invoiceId: string) {
    return request<DocumentUpdated>(
      `/api/invoices/${encodeURIComponent(invoiceId)}/send`,
      {
        method: 'POST',
        headers: commandHeaders(),
        body: JSON.stringify({}),
      }
    )
  },
  prepareInvoiceEmail(invoiceId: string, params: DocumentEmailPrepareParams = {}) {
    return prepareEmail(invoiceId, '/api/invoices', params)
  },
  sendInvoiceEmail(invoiceId: string, params: DocumentEmailSendParams) {
    return sendEmail(invoiceId, '/api/invoices', params)
  },
  prepareQuoteEmail(quoteId: string, params: DocumentEmailPrepareParams = {}) {
    return prepareEmail(quoteId, '/api/quotes', params)
  },
  sendQuoteEmail(quoteId: string, params: DocumentEmailSendParams) {
    return sendEmail(quoteId, '/api/quotes', params)
  },
  void(invoiceId: string, reason: string | null) {
    return request<DocumentUpdated>(
      `/api/invoices/${encodeURIComponent(invoiceId)}/void`,
      {
        method: 'POST',
        headers: commandHeaders(),
        body: JSON.stringify({ reason }),
      }
    )
  },
  writeOff(invoiceId: string, reason: string) {
    return request<DocumentUpdated>(
      `/api/invoices/${encodeURIComponent(invoiceId)}/write-off`,
      {
        method: 'POST',
        headers: commandHeaders(),
        body: JSON.stringify({ reason }),
      }
    )
  },
  transitionQuote(
    quoteId: string,
    action: 'send' | 'accept' | 'decline' | 'cancel' | 'expire'
  ) {
    return request<DocumentUpdated>(
      `/api/quotes/${encodeURIComponent(quoteId)}/${action}`,
      {
        method: 'POST',
        headers: commandHeaders(),
        body: JSON.stringify({}),
      }
    )
  },
  convertQuoteToInvoice(quoteId: string) {
    return request<DocumentCreated>(
      `/api/quotes/${encodeURIComponent(quoteId)}/convert-to-invoice`,
      {
        method: 'POST',
        headers: commandHeaders(),
        body: JSON.stringify({}),
      }
    )
  },
  delete(invoiceId: string, endpoint: DocumentEndpoint = '/api/invoices') {
    return request<DocumentDeleted>(
      `${endpoint}/${encodeURIComponent(invoiceId)}`,
      { method: 'DELETE' }
    )
  },
}
