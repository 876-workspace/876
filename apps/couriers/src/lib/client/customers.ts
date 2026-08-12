'use client'

import type {
  CustomerCreateParams,
  CustomerEnrollmentParams,
  CustomerUpdateParams,
  CustomerView,
  DeletedCustomer,
} from '@/types/customer'
import { request } from './request'

export const create = (orgSlug: string, params: CustomerCreateParams) =>
  request<CustomerView>('/api/manage/customers', {
    method: 'POST',
    body: JSON.stringify({ orgSlug, ...params }),
  })
export const enroll = (orgSlug: string, params: CustomerEnrollmentParams) =>
  request<CustomerView>('/api/manage/customers/enrollments', {
    method: 'POST',
    body: JSON.stringify({ orgSlug, ...params }),
  })
export const update = (
  orgSlug: string,
  id: string,
  params: CustomerUpdateParams
) =>
  request<CustomerView>(`/api/manage/customers/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ orgSlug, ...params }),
  })
export const remove = (orgSlug: string, id: string) =>
  request<DeletedCustomer>(
    `/api/manage/customers/${encodeURIComponent(id)}?orgSlug=${encodeURIComponent(orgSlug)}`,
    { method: 'DELETE' }
  )
export const customers = { create, enroll, update, delete: remove }
