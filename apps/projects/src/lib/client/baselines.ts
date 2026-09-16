'use client'

import type { BaselineDetail, Deleted } from '@876/projects/contracts'

import { request } from './request'

export type CreateBaselineParams = {
  name: string
  note?: string | null
}

function root(projectId: string) {
  return `/api/projects/${encodeURIComponent(projectId)}/baselines`
}

export const baselinesClient = {
  create(projectId: string, params: CreateBaselineParams) {
    return request<BaselineDetail>(root(projectId), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(params),
    })
  },
  delete(projectId: string, baselineId: string) {
    return request<Deleted>(
      `${root(projectId)}/${encodeURIComponent(baselineId)}`,
      {
        method: 'DELETE',
      }
    )
  },
}
