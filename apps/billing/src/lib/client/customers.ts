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
  CustomerImportRawRow,
  CustomerImportResult,
} from '@/types/customer-import'

import { request } from './request'

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
  create,
  retrieve,
  update,
  delete: deleteCustomer,
  import: importCustomers,
  link,
  unlink,
}
