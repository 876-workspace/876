import { request } from '../request'
import type { Runtime } from '../runtime'
import {
  workItemTypeListSchema,
  workItemTypeSchema,
  type CreateWorkItemTypeInput,
  type RequestOptions,
  type UpdateWorkItemTypeInput,
} from '../types'

function root(organizationId: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/work-item-types`
}

export function createWorkItemTypesResource(runtime: Runtime) {
  return {
    list(organizationId: string, options: RequestOptions = {}) {
      return request(
        runtime,
        { method: 'GET', path: root(organizationId), signal: options.signal },
        workItemTypeListSchema
      )
    },
    create(
      organizationId: string,
      input: CreateWorkItemTypeInput,
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
        workItemTypeSchema
      )
    },
    retrieve(organizationId: string, id: string, options: RequestOptions = {}) {
      return request(
        runtime,
        {
          method: 'GET',
          path: `${root(organizationId)}/${encodeURIComponent(id)}`,
          signal: options.signal,
        },
        workItemTypeSchema
      )
    },
    update(
      organizationId: string,
      id: string,
      input: UpdateWorkItemTypeInput,
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
        workItemTypeSchema
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
        workItemTypeSchema
      )
    },
  }
}
