'use client'

import type {
  CrmCustomer,
  CrmCustomerCreateInput,
  CrmCustomerUpdateInput,
} from '@876/client'

import { request } from './request'

export type CustomerInput = Omit<CrmCustomerCreateInput, 'idempotencyKey'>
export type CustomerUpdateInput = CrmCustomerUpdateInput

export const customers = {
  create(params: CustomerInput, idempotencyKey: string) {
    return request<CrmCustomer>('/api/customers', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-idempotency-key': idempotencyKey,
      },
      body: JSON.stringify(params),
    })
  },
  update(id: string, params: CustomerUpdateInput) {
    return request<CrmCustomer>(`/api/customers/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(params),
    })
  },
  delete(id: string, reason?: string) {
    return request<{ object: 'customer'; id: string; deleted: true }>(
      `/api/customers/${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reason: reason ?? null }),
      }
    )
  },
}
