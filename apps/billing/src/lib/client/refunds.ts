'use client'

import type { RefundCreateInput, RefundCreated } from '@/types/refund'

import { request } from './request'

const create = (params: RefundCreateInput) =>
  request<RefundCreated>('/api/v1/refunds', {
    method: 'POST',
    body: JSON.stringify(params),
  })

export const refunds = { create }
