'use client'

import { request } from './request'

export type RoleCreateInput = {
  name: string
  slug: string
  description: string
  permissions: string[]
}

export type RoleUpdateInput = {
  name: string
  description: string
  permissions: string[]
}

export const roles = {
  create(input: RoleCreateInput) {
    return request<{ id: string }>('/api/roles', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    })
  },
  update(roleId: string, input: RoleUpdateInput) {
    return request<{ id: string }>(`/api/roles/${encodeURIComponent(roleId)}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    })
  },
  delete(roleId: string) {
    return request<{ id: string; deleted: true }>(
      `/api/roles/${encodeURIComponent(roleId)}`,
      { method: 'DELETE' }
    )
  },
}
