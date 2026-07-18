'use client'

import type { SalespersonCreateInput } from '@/types/salesperson'

import { request } from './request'

const create = (params: SalespersonCreateInput) =>
  request<{ object: 'salesperson'; id: string }>('/api/v1/salespeople', {
    method: 'POST',
    body: JSON.stringify(params),
  })

export const salespeople = { create }
