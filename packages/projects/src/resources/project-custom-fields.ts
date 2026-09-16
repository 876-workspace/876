import { request } from '../request'
import type { Runtime } from '../runtime'
import {
  deletedSchema,
  projectCustomFieldListSchema,
  projectCustomFieldSchema,
  projectCustomFieldValueListSchema,
  type CreateProjectCustomFieldInput,
  type RequestOptions,
  type SetProjectCustomFieldValuesInput,
  type UpdateProjectCustomFieldInput,
} from '../types'

function root(organizationId: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/project-custom-fields`
}

function valuesRoot(organizationId: string, projectId: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/projects/${encodeURIComponent(projectId)}/custom-field-values`
}

export function createProjectCustomFieldsResource(runtime: Runtime) {
  return {
    list(organizationId: string, options: RequestOptions = {}) {
      return request(
        runtime,
        { method: 'GET', path: root(organizationId), signal: options.signal },
        projectCustomFieldListSchema
      )
    },
    create(
      organizationId: string,
      input: CreateProjectCustomFieldInput,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'POST',
          path: root(organizationId),
          body: input,
          signal: options.signal,
        },
        projectCustomFieldSchema
      )
    },
    update(
      organizationId: string,
      id: string,
      input: UpdateProjectCustomFieldInput,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'PATCH',
          path: `${root(organizationId)}/${encodeURIComponent(id)}`,
          body: input,
          signal: options.signal,
        },
        projectCustomFieldSchema
      )
    },
    delete(organizationId: string, id: string, options: RequestOptions = {}) {
      return request(
        runtime,
        {
          method: 'DELETE',
          path: `${root(organizationId)}/${encodeURIComponent(id)}`,
          signal: options.signal,
        },
        deletedSchema
      )
    },
    values: {
      list(
        organizationId: string,
        projectId: string,
        options: RequestOptions = {}
      ) {
        return request(
          runtime,
          {
            method: 'GET',
            path: valuesRoot(organizationId, projectId),
            signal: options.signal,
          },
          projectCustomFieldValueListSchema
        )
      },
      set(
        organizationId: string,
        projectId: string,
        input: SetProjectCustomFieldValuesInput,
        options: RequestOptions = {}
      ) {
        return request(
          runtime,
          {
            method: 'PUT',
            path: valuesRoot(organizationId, projectId),
            body: input,
            signal: options.signal,
          },
          projectCustomFieldValueListSchema
        )
      },
    },
  }
}
