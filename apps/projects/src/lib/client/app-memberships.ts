'use client'

import type { WorkspaceSessionClient } from '@876/workspace/session'

import { request } from './request'

type AppMembershipCreateInput = Parameters<
  WorkspaceSessionClient['appMemberships']['create']
>[1]
type AppMembershipUpdateInput = Parameters<
  WorkspaceSessionClient['appMemberships']['update']
>[2]
type AppMembership = NonNullable<
  Awaited<
    ReturnType<WorkspaceSessionClient['appMemberships']['create']>
  >['data']
>
type DeletedAppMembership = NonNullable<
  Awaited<
    ReturnType<WorkspaceSessionClient['appMemberships']['delete']>
  >['data']
>

function assignmentPath(assignmentId: string): string {
  return `/api/app-memberships/${encodeURIComponent(assignmentId)}`
}

export const appMemberships = {
  create(input: AppMembershipCreateInput) {
    return request<AppMembership>('/api/app-memberships', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    })
  },
  update(assignmentId: string, input: AppMembershipUpdateInput) {
    return request<AppMembership>(assignmentPath(assignmentId), {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    })
  },
  remove(assignmentId: string) {
    return request<DeletedAppMembership>(assignmentPath(assignmentId), {
      method: 'DELETE',
    })
  },
}
