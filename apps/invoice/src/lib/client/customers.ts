'use client'

import { request } from './request'
import type {
  CustomerList,
  CustomerContact,
  CustomerContactCreateParams,
  CustomerContactCreated,
  DeletedCustomerContact,
} from '@876/billing'

interface CreateCustomerParams {
  name: string
  email?: string | null
  phone?: string | null
  companyName?: string | null
}

export const list = (
  params: { q?: string; limit?: number } = {},
  init?: { signal?: AbortSignal }
) => {
  const search = new URLSearchParams({
    status: 'ACTIVE',
    limit: String(params.limit ?? 20),
  })
  if (params.q) search.set('q', params.q)

  return request<CustomerList>(`/api/customers?${search.toString()}`, {
    method: 'GET',
    signal: init?.signal,
  })
}

/** Update is a PATCH: every field is optional and omitted fields are left alone. */
interface UpdateCustomerParams extends Partial<CreateCustomerParams> {
  status?: 'ACTIVE' | 'ARCHIVED'
}

export const customers = {
  list,
  create(params: CreateCustomerParams) {
    return request<{ id: string }>('/api/customers', {
      method: 'POST',
      headers: { 'Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify(params),
    })
  },

  update(customerId: string, params: UpdateCustomerParams) {
    return request<{ id: string }>(
      `/api/customers/${encodeURIComponent(customerId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(params),
      }
    )
  },

  /** Deletes a customer by ID. */
  delete(customerId: string) {
    return request<{ id: string; deleted: true }>(
      `/api/customers/${encodeURIComponent(customerId)}`,
      { method: 'DELETE' }
    )
  },
  contacts: {
    create(customerId: string, params: CustomerContactCreateParams) {
      return request<CustomerContactCreated>(
        `/api/customers/${encodeURIComponent(customerId)}/contacts`,
        { method: 'POST', body: JSON.stringify(params) }
      )
    },
    update(
      customerId: string,
      contactId: string,
      params: CustomerContactCreateParams
    ) {
      return request<CustomerContact>(
        `/api/customers/${encodeURIComponent(customerId)}/contacts/${encodeURIComponent(contactId)}`,
        { method: 'PATCH', body: JSON.stringify(params) }
      )
    },
    delete(customerId: string, contactId: string) {
      return request<DeletedCustomerContact>(
        `/api/customers/${encodeURIComponent(customerId)}/contacts/${encodeURIComponent(contactId)}`,
        { method: 'DELETE' }
      )
    },
  },
}
