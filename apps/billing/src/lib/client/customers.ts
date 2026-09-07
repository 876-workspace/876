import type {
  CustomerCreated,
  CustomerCreateInput,
  CustomerDeleted,
  CustomerLinkInput,
  CustomerResource,
  CustomerUpdated,
  CustomerUpdateInput,
} from '@/types/customer'
import type {
  CustomerContact,
  CustomerContactCreateParams,
  CustomerContactCreated,
  CustomerList,
  DeletedCustomerContact,
} from '@876/billing'
import type {
  CustomerImportRawRow,
  CustomerImportResult,
} from '@/types/customer-import'

import { request } from './request'

export const list = (
  params: { q?: string; limit?: number } = {},
  init?: { signal?: AbortSignal }
) => {
  const search = new URLSearchParams({
    status: 'ACTIVE',
    limit: String(params.limit ?? 20),
  })
  if (params.q) search.set('q', params.q)

  return request<CustomerList>(`/api/v1/customers?${search.toString()}`, {
    method: 'GET',
  })
}

export const create = (params: CustomerCreateInput) =>
  request<CustomerCreated>('/api/v1/customers', {
    method: 'POST',
    body: JSON.stringify(params),
  })

export const retrieve = (customerId: string) =>
  request<CustomerResource>(
    `/api/v1/customers/${encodeURIComponent(customerId)}`,
    {
      method: 'GET',
    }
  )

export const update = (customerId: string, params: CustomerUpdateInput) =>
  request<CustomerUpdated>(
    `/api/v1/customers/${encodeURIComponent(customerId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(params),
    }
  )

const deleteCustomer = (customerId: string) =>
  request<CustomerDeleted>(
    `/api/v1/customers/${encodeURIComponent(customerId)}`,
    {
      method: 'DELETE',
    }
  )

const importCustomers = (rows: CustomerImportRawRow[]) =>
  request<CustomerImportResult>('/api/v1/customers/import', {
    method: 'POST',
    body: JSON.stringify({ rows }),
  })

const link = (customerId: string, params: CustomerLinkInput) =>
  request<CustomerUpdated>(
    `/api/v1/customers/${encodeURIComponent(customerId)}/link`,
    {
      method: 'POST',
      body: JSON.stringify(params),
    }
  )

const unlink = (customerId: string) =>
  request<CustomerUpdated>(
    `/api/v1/customers/${encodeURIComponent(customerId)}/unlink`,
    {
      method: 'POST',
    }
  )

export const customers = {
  list,
  create,
  retrieve,
  update,
  delete: deleteCustomer,
  import: importCustomers,
  link,
  unlink,
  contacts: {
    create(customerId: string, params: CustomerContactCreateParams) {
      return request<CustomerContactCreated>(
        `/api/v1/customers/${encodeURIComponent(customerId)}/contacts`,
        { method: 'POST', body: JSON.stringify(params) }
      )
    },
    update(
      customerId: string,
      contactId: string,
      params: CustomerContactCreateParams
    ) {
      return request<CustomerContact>(
        `/api/v1/customers/${encodeURIComponent(customerId)}/contacts/${encodeURIComponent(contactId)}`,
        { method: 'PATCH', body: JSON.stringify(params) }
      )
    },
    delete(customerId: string, contactId: string) {
      return request<DeletedCustomerContact>(
        `/api/v1/customers/${encodeURIComponent(customerId)}/contacts/${encodeURIComponent(contactId)}`,
        { method: 'DELETE' }
      )
    },
  },
}
