'use client'

import type {
  CreateCycleInput,
  Cycle,
  UpdateCycleInput,
} from '@876/projects/contracts'

import { request } from './request'

type CreateCycleParams = Omit<CreateCycleInput, 'actorUserId'>
type UpdateCycleParams = Omit<UpdateCycleInput, 'actorUserId'>

export const cyclesClient = {
  create(params: CreateCycleParams) {
    return request<Cycle>('/api/cycles', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(params),
    })
  },
  update(cycleId: string, params: UpdateCycleParams) {
    return request<Cycle>(`/api/cycles/${encodeURIComponent(cycleId)}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(params),
    })
  },
  delete(cycleId: string) {
    return request<{ object: string; id: string; deleted: true }>(
      `/api/cycles/${encodeURIComponent(cycleId)}`,
      { method: 'DELETE' }
    )
  },
  assignIssues(cycleId: string, issueIds: string[]) {
    return request<Cycle>(`/api/cycles/${encodeURIComponent(cycleId)}/issues`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ issueIds }),
    })
  },
  unassignIssue(cycleId: string, issueId: string) {
    return request<Cycle>(
      `/api/cycles/${encodeURIComponent(cycleId)}/issues/${encodeURIComponent(issueId)}`,
      { method: 'DELETE' }
    )
  },
}
