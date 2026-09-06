'use client'

import { request } from './request'

export interface DocumentLineCreateParams {
  itemId?: string | null
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
  estimateId?: string | null
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

interface DocumentCreated {
  object: 'invoice' | 'quote'
  id: string
}

type DocumentCreateEndpoint = '/api/invoices' | '/api/quotes'

export const documents = {
  create(
    params: DocumentCreateParams,
    endpoint: DocumentCreateEndpoint = '/api/invoices'
  ) {
    return request<DocumentCreated>(endpoint, {
      method: 'POST',
      headers: { 'Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify(params),
    })
  },
}
