'use client'

import type { RefundFormSubmitParams } from '@876/billing-ui/refund-form'

import { request } from './request'

export interface RefundCreateParams extends RefundFormSubmitParams {
  customerId: string
  currency: string
  paymentId?: string
  creditNoteId?: string
}

interface RefundCreated {
  object: 'refund'
  id: string
}

export const refunds = {
  create(params: RefundCreateParams) {
    return request<RefundCreated>('/api/refunds', {
      method: 'POST',
      body: JSON.stringify(params),
    })
  },
}
