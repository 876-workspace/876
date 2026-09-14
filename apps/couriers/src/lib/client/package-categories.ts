'use client'

import type {
  CreatePackageCategoryBody,
  DeletedPackageCategory,
  PackageCategory,
  UpdatePackageCategoryBody,
} from '@876/couriers/admin'

import { request } from './request'

export const create = (orgSlug: string, body: CreatePackageCategoryBody) =>
  request<PackageCategory>('/api/manage/package-categories', {
    method: 'POST',
    body: JSON.stringify({ orgSlug, ...body }),
  })

export const update = (
  orgSlug: string,
  id: string,
  body: UpdatePackageCategoryBody
) =>
  request<PackageCategory>(
    `/api/manage/package-categories/${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ orgSlug, ...body }),
    }
  )

export const archive = (orgSlug: string, id: string) =>
  request<DeletedPackageCategory>(
    `/api/manage/package-categories/${encodeURIComponent(id)}?orgSlug=${encodeURIComponent(orgSlug)}`,
    { method: 'DELETE' }
  )

export const packageCategories = { create, update, archive }
