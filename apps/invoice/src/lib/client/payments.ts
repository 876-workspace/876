'use client'

import type { PaymentReceivedSubmitParams } from '@876/billing-ui/payment-received-form'

import { request } from './request'

interface PaymentCreated {
  object: 'payment'
  id: string
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
}
