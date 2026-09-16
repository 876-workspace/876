'use client'

import type {
  CreateCapacityInput,
  MemberCapacity,
  UpdateCapacityInput,
} from '@876/projects'

import { request } from './request'

export type CreateCapacityParams = CreateCapacityInput
export type UpdateCapacityParams = UpdateCapacityInput

function json(body: unknown): RequestInit {
  return {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }
}

/**
 * Capacity writes go through this app's own routes, which resolve the
 * organization and the acting user from the sealed session: the browser never
 * names either.
 */
export const reportsClient = {
  createCapacity(params: CreateCapacityParams) {
    return request<MemberCapacity>('/api/capacity', json(params))
  },
  updateCapacity(capacityId: string, params: UpdateCapacityParams) {
    return request<MemberCapacity>(
      `/api/capacity/${encodeURIComponent(capacityId)}`,
      { ...json(params), method: 'PATCH' }
    )
  },
}
