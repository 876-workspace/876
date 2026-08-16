'use client'

import { request } from './request'

interface CreateCustomerParams {
  name: string
  email?: string | null
  phone?: string | null
  companyName?: string | null
}

/** Update is a PATCH: every field is optional and omitted fields are left alone. */
interface UpdateCustomerParams extends Partial<CreateCustomerParams> {
  status?: 'ACTIVE' | 'ARCHIVED'
}

export const customers = {
  create(params: CreateCustomerParams) {
    return request<{ id: string }>('/api/v1/customers', {
      method: 'POST',
      body: JSON.stringify(params),
    })
  },

  update(customerId: string, params: UpdateCustomerParams) {
    return request<{ id: string }>(
      `/api/v1/customers/${encodeURIComponent(customerId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(params),
      }
    )
  },

  /** Deletes a customer by ID. */
  delete(customerId: string) {
    return request<{ id: string; deleted: true }>(
      `/api/v1/customers/${encodeURIComponent(customerId)}`,
      { method: 'DELETE' }
    )
  },
}
