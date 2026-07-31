'use client'

import type {
  WarehouseCreateParams,
  WarehouseUpdateParams,
  WarehouseView,
} from '@/types/warehouse'

import { request } from './request'

export const create = (orgSlug: string, params: WarehouseCreateParams) =>
  request<WarehouseView>('/api/manage/warehouses', {
    method: 'POST',
    body: JSON.stringify({ orgSlug, ...params }),
  })

export const update = (
  orgSlug: string,
  id: string,
  params: WarehouseUpdateParams
) =>
  request<WarehouseView>(`/api/manage/warehouses/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ orgSlug, ...params }),
  })

export const warehouses = { create, update }
