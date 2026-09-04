import { request } from '../request'
import type { Runtime } from '../runtime'
import {
  workflowStateListSchema,
  workflowStateSchema,
  type CreateWorkflowStateInput,
  type RequestOptions,
  type UpdateWorkflowStateInput,
} from '../types'

function root(organizationId: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/workflow-states`
}

export function createWorkflowStatesResource(runtime: Runtime) {
  return {
    list(organizationId: string, options: RequestOptions = {}) {
      return request(
        runtime,
        { method: 'GET', path: root(organizationId), signal: options.signal },
        workflowStateListSchema
      )
    },
    create(
      organizationId: string,
      input: CreateWorkflowStateInput,
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
        workflowStateSchema
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
        workflowStateSchema
      )
    },
    update(
      organizationId: string,
      id: string,
      input: UpdateWorkflowStateInput,
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
        workflowStateSchema
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
        workflowStateSchema
      )
    },
  }
}
