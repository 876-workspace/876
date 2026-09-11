'use client'

import type {
  SalesReceipt,
  SalesReceiptCreateParams,
  SalesReceiptRefundParams,
  SalesReceiptVoidParams,
} from '@876/billing'

import { request } from './request'

const resourcePath = (salesReceiptId: string) =>
  `/api/v1/sales-receipts/${encodeURIComponent(salesReceiptId)}`

export const salesReceipts = {
  create(params: SalesReceiptCreateParams) {
    return request<SalesReceipt>('/api/v1/sales-receipts', {
      method: 'POST',
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
