'use client'

import type {
  AddressCreateParams,
  AddressUpdateParams,
  AddressView,
  DeletedAddress,
} from '@/types/address'

import { request } from './request'

export const create = (orgSlug: string, params: AddressCreateParams) =>
  request<AddressView>('/api/manage/addresses', {
    method: 'POST',
    body: JSON.stringify({ orgSlug, ...params }),
  })

export const update = (
  orgSlug: string,
  id: string,
  params: AddressUpdateParams
) =>
  request<AddressView>(`/api/manage/addresses/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ orgSlug, ...params }),
  })

export const del = (orgSlug: string, id: string) =>
  request<DeletedAddress>(
    `/api/manage/addresses/${encodeURIComponent(id)}?orgSlug=${encodeURIComponent(orgSlug)}`,
    { method: 'DELETE' }
  )

export const addresses = { create, update, del, delete: del }
