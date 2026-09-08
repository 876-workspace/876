'use client'

import type { PaymentReceivedSubmitParams } from '@876/billing-ui/payment-received-form'

import { request } from './request'

interface PaymentCreated {
  object: 'payment'
  id: string
}

interface PaymentDeleted extends PaymentCreated {
  deleted: true
}

function idempotencyKey(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
}

export const payments = {
  create(params: PaymentReceivedSubmitParams) {
    return request<PaymentCreated>('/api/payments', {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey() },
      body: JSON.stringify(params),
    })
  },
  update(paymentId: string, params: PaymentReceivedSubmitParams) {
    return request<PaymentCreated>(
      `/api/payments/${encodeURIComponent(paymentId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(params),
      }
    )
  },
  delete(paymentId: string) {
    return request<PaymentDeleted>(
      `/api/payments/${encodeURIComponent(paymentId)}`,
      { method: 'DELETE' }
    )
  },
}
