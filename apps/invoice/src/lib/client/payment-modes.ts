'use client'

import type {
  PaymentMode,
  PaymentModeCreateParams,
  PaymentModeDeleted,
  PaymentModeUpdateParams,
} from '@876/billing'

import { request } from './request'

export const paymentModes = {
  create(params: PaymentModeCreateParams) {
    return request<PaymentMode>('/api/payment-modes', {
      method: 'POST',
      body: JSON.stringify(params),
    })
  },
  update(id: string, params: PaymentModeUpdateParams) {
    return request<PaymentMode>(
      `/api/payment-modes/${encodeURIComponent(id)}`,
      { method: 'PATCH', body: JSON.stringify(params) }
    )
  },
  delete(id: string) {
    return request<PaymentModeDeleted>(
      `/api/payment-modes/${encodeURIComponent(id)}`,
      { method: 'DELETE' }
    )
  },
}
