'use client'

import type {
  RecurringInvoice,
  RecurringInvoiceCreateParams,
  RecurringInvoiceList,
  RecurringInvoiceListParams,
  RecurringInvoiceUpdateParams,
} from '@876/billing'

import { request } from './request'

const resourcePath = (recurringInvoiceId: string) =>
  `/api/recurring-invoices/${encodeURIComponent(recurringInvoiceId)}`

function idempotencyKey(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
}

export const recurringInvoices = {
  list(params: RecurringInvoiceListParams = {}) {
    const query = new URLSearchParams()
    if (params.status) query.set('status', params.status)
    if (params.customerId) query.set('customerId', params.customerId)
    const suffix = query.size > 0 ? `?${query.toString()}` : ''
    return request<RecurringInvoiceList>(`/api/recurring-invoices${suffix}`)
  },
  create(params: RecurringInvoiceCreateParams) {
    return request<RecurringInvoice>('/api/recurring-invoices', {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey() },
      body: JSON.stringify(params),
    })
  },
  update(recurringInvoiceId: string, params: RecurringInvoiceUpdateParams) {
    return request<RecurringInvoice>(resourcePath(recurringInvoiceId), {
      method: 'PATCH',
      body: JSON.stringify(params),
    })
  },
  pause(recurringInvoiceId: string) {
    return request<RecurringInvoice>(
      `${resourcePath(recurringInvoiceId)}/pause`,
      {
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey() },
        body: JSON.stringify({}),
      }
    )
  },
  resume(recurringInvoiceId: string) {
    return request<RecurringInvoice>(
      `${resourcePath(recurringInvoiceId)}/resume`,
      {
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey() },
        body: JSON.stringify({}),
      }
    )
  },
  stop(recurringInvoiceId: string) {
    return request<RecurringInvoice>(`${resourcePath(recurringInvoiceId)}/stop`, {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey() },
      body: JSON.stringify({}),
    })
  },
  remove(recurringInvoiceId: string) {
    return request<{ id: string }>(resourcePath(recurringInvoiceId), {
      method: 'DELETE',
    })
  },
}
