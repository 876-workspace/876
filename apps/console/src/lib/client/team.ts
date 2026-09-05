import { request } from './request'
import type { TeamGrantUpdate } from '@/types/team'

export const revoke = (userId: string) =>
  request<{ count: number }>(`/api/team/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  })

export const update = (userId: string, params: TeamGrantUpdate) =>
  request<{ userId: string }>(`/api/team/${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    body: JSON.stringify(params),
  })

export const team = { revoke, update }
