'use client'

import type {
  CreatePackageBody,
  Package,
  UpdatePackageBody,
} from '@876/couriers/admin'

import { request } from './request'

export const create = (orgSlug: string, params: CreatePackageBody) =>
  request<Package>('/api/manage/packages', {
    method: 'POST',
    body: JSON.stringify({ orgSlug, ...params }),
  })

export const update = (
  orgSlug: string,
  id: string,
  params: UpdatePackageBody
) =>
  request<Package>(`/api/manage/packages/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ orgSlug, ...params }),
  })

export const packages = { create, update }
