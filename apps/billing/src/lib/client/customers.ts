import type {
  CustomerCreated,
  CustomerCreateInput,
  CustomerDeleted,
  CustomerResource,
  CustomerUpdated,
  CustomerUpdateInput,
} from '@/types/customer'

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

export const customers = {
  create,
  retrieve,
  update,
  delete: deleteCustomer,
}
