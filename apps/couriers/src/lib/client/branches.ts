'use client'

import type {
  BranchCreateParams,
  BranchUpdateParams,
  BranchView,
} from '@/types/branch'

import { request } from './request'

export const create = (orgSlug: string, params: BranchCreateParams) =>
  request<BranchView>('/api/manage/branches', {
    method: 'POST',
    body: JSON.stringify({ orgSlug, ...params }),
  })

export const update = (
  orgSlug: string,
  id: string,
  params: BranchUpdateParams
) =>
  request<BranchView>(`/api/manage/branches/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ orgSlug, ...params }),
  })

export const branches = { create, update }
