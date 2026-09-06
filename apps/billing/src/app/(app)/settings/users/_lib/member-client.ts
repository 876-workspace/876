'use client'

import type { WorkspaceSessionClient } from '@876/workspace/session'
import { request } from '@/lib/client/request'

type CreateInput = Parameters<
  WorkspaceSessionClient['appMemberships']['create']
>[1]
type UpdateInput = Parameters<
  WorkspaceSessionClient['appMemberships']['update']
>[2]
type Membership = NonNullable<
  Awaited<
    ReturnType<WorkspaceSessionClient['appMemberships']['create']>
  >['data']
>
type Deleted = NonNullable<
  Awaited<
    ReturnType<WorkspaceSessionClient['appMemberships']['delete']>
  >['data']
>
const path = (id: string) => `/api/app-memberships/${encodeURIComponent(id)}`
export const appMemberships = {
  create(input: CreateInput) {
    return request<Membership>('/api/app-memberships', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    })
  },
  update(id: string, input: UpdateInput) {
    return request<Membership>(path(id), {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    })
  },
  remove(id: string) {
    return request<Deleted>(path(id), { method: 'DELETE' })
  },
}
