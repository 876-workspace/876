'use client'

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

export const documents = {
  create(
    params: DocumentCreateParams,
    endpoint: DocumentEndpoint = '/api/invoices'
  ) {
    return request<DocumentCreated>(endpoint, {
      method: 'POST',
      headers: { 'Idempotency-Key': crypto.randomUUID() },
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
  transitionQuote(
    quoteId: string,
    action: 'send' | 'accept' | 'decline' | 'cancel'
  ) {
    return request<DocumentUpdated>(
      `/api/quotes/${encodeURIComponent(quoteId)}/${action}`,
      { method: 'POST', body: JSON.stringify({}) }
    )
  },
  delete(invoiceId: string, endpoint: DocumentEndpoint = '/api/invoices') {
    return request<DocumentDeleted>(
      `${endpoint}/${encodeURIComponent(invoiceId)}`,
      { method: 'DELETE' }
    )
  },
}
