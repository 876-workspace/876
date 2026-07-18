'use client'

import type { PaymentProviderConnectionCreateInput } from '@/types/payment-provider'

import { request } from './request'

const createConnection = (params: PaymentProviderConnectionCreateInput) =>
  request<{ object: 'payment_provider_connection'; id: string }>(
    '/api/v1/payment-providers/connections',
    { method: 'POST', body: JSON.stringify(params) }
  )

export const paymentProviders = { connections: { create: createConnection } }
