'use client'

import type {
  SalesReceipt,
  SalesReceiptCreateParams,
  SalesReceiptRefundParams,
  SalesReceiptVoidParams,
} from '@876/billing'

import { request } from './request'

const resourcePath = (salesReceiptId: string) =>
  `/api/sales-receipts/${encodeURIComponent(salesReceiptId)}`

function idempotencyKey(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
}

export const salesReceipts = {
  create(params: SalesReceiptCreateParams) {
    return request<SalesReceipt>('/api/sales-receipts', {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey() },
      body: JSON.stringify(params),
    })
  },
  refund(salesReceiptId: string, params: SalesReceiptRefundParams) {
    return request<SalesReceipt>(`${resourcePath(salesReceiptId)}/refund`, {
      method: 'POST',
      body: JSON.stringify(params),
    })
  },
  void(salesReceiptId: string, params: SalesReceiptVoidParams = {}) {
    return request<SalesReceipt>(`${resourcePath(salesReceiptId)}/void`, {
      method: 'POST',
      body: JSON.stringify(params),
    })
  },
}
