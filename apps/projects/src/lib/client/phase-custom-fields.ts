'use client'

import type {
  CreateMilestoneCustomFieldInput,
  MilestoneCustomField,
  UpdateMilestoneCustomFieldInput,
} from '@876/projects/contracts'

import { request } from './request'

export const phaseCustomFieldsClient = {
  create(params: CreateMilestoneCustomFieldInput) {
    return request<MilestoneCustomField>('/api/phase-custom-fields', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(params),
    })
  },
  update(id: string, params: UpdateMilestoneCustomFieldInput) {
    return request<MilestoneCustomField>(
      `/api/phase-custom-fields/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(params),
      }
    )
  },
  delete(id: string) {
    return request<{ object: string; id: string; deleted: true }>(
      `/api/phase-custom-fields/${encodeURIComponent(id)}`,
      { method: 'DELETE' }
    )
  },
}
