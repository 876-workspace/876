'use client'

import { request } from './request'

export type CustomerInput = {
  customerKind: 'INDIVIDUAL' | 'BUSINESS'
  firstName?: string | null
  lastName?: string | null
  companyName?: string | null
  email?: string | null
  phone?: string | null
  ownerId?: string | null
}

export type CustomerUpdateInput = CustomerInput & {
  status: 'ACTIVE' | 'INACTIVE'
}

export const customers = {
  create(params: CustomerInput, idempotencyKey: string) {
    return request<{ profile: { id: string }; customer: { id: string } }>(
      '/api/customers',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-idempotency-key': idempotencyKey,
        },
        body: JSON.stringify(params),
      }
    )
  },
  update(id: string, params: CustomerUpdateInput) {
    return request(`/api/customers/${encodeURIComponent(id)}`, {
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
