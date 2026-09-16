'use client'

import type {
  CreateProjectCustomFieldInput,
  ProjectCustomField,
  ProjectCustomFieldValue,
  SetProjectCustomFieldValuesInput,
  UpdateProjectCustomFieldInput,
} from '@876/projects/contracts'

import { request } from './request'

type SetValuesParams = Omit<SetProjectCustomFieldValuesInput, 'updatedBy'>

/**
 * Project field writes go through this app's own routes, which resolve the
 * organization and the acting user from the sealed session: the browser never
 * names either.
 */
export const projectCustomFieldsClient = {
  create(params: CreateProjectCustomFieldInput) {
    return request<ProjectCustomField>('/api/project-custom-fields', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(params),
    })
  },
  update(id: string, params: UpdateProjectCustomFieldInput) {
    return request<ProjectCustomField>(
      `/api/project-custom-fields/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(params),
      }
    )
  },
  delete(id: string) {
    return request<{ object: string; id: string; deleted: true }>(
      `/api/project-custom-fields/${encodeURIComponent(id)}`,
      { method: 'DELETE' }
    )
  },
  values: {
    set(projectId: string, customFields: SetValuesParams['customFields']) {
      return request<ProjectCustomFieldValue[]>(
        `/api/projects/${encodeURIComponent(projectId)}/custom-field-values`,
        {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ customFields }),
        }
      )
    },
  },
}
