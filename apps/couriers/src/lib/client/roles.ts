'use client'

import type {
  DeletedRole,
  RoleCreateParams,
  RoleUpdateParams,
  RoleView,
} from '@/types/role'

import { request } from './request'

export const create = (orgSlug: string, params: RoleCreateParams) =>
  request<RoleView>('/api/manage/roles', {
    method: 'POST',
    body: JSON.stringify({ orgSlug, ...params }),
  })

export const update = (orgSlug: string, id: string, params: RoleUpdateParams) =>
  request<RoleView>(`/api/manage/roles/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ orgSlug, ...params }),
  })

export const del = (orgSlug: string, id: string) =>
  request<DeletedRole>(
    `/api/manage/roles/${encodeURIComponent(id)}?orgSlug=${encodeURIComponent(orgSlug)}`,
    { method: 'DELETE' }
  )

export const roles = { create, update, del, delete: del }
