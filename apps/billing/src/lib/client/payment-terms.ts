'use client'

import type { PaymentTermCreateInput } from '@/types/payment-term'

import { request } from './request'

const create = (params: PaymentTermCreateInput) =>
  request<{ object: 'payment_term'; id: string }>('/api/v1/payment-terms', {
    method: 'POST',
    body: JSON.stringify(params),
  })

export const paymentTerms = { create }
