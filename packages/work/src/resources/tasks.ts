import { z } from 'zod'

import { workRequest } from '../request'
import type { WorkRuntime } from '../runtime'
import {
  workTaskListSchema,
  workTaskSchema,
  type CreateWorkTaskInput,
  type UpdateWorkTaskInput,
  type WorkTaskListFilter,
} from '../types'

function root(organizationId: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/tasks`
}

function listPath(organizationId: string, filter: WorkTaskListFilter) {
  const params = new URLSearchParams()
  if (filter.context) {
    params.set('context_service', filter.context.service)
    params.set('context_resource', filter.context.resource)
    params.set('context_id', filter.context.id)
  }
  if (filter.priorityId) params.set('priority_id', filter.priorityId)
  if (filter.limit) params.set('limit', String(filter.limit))
  if (filter.startingAfter) params.set('starting_after', filter.startingAfter)
  if (filter.endingBefore) params.set('ending_before', filter.endingBefore)
  const query = params.toString()
  return `${root(organizationId)}${query ? `?${query}` : ''}`
}

export function createTasksResource(runtime: WorkRuntime) {
  return {
    list(organizationId: string, filter: WorkTaskListFilter = {}) {
      return workRequest(
        runtime,
        { method: 'GET', path: listPath(organizationId, filter) },
        workTaskListSchema
      )
    },
    retrieve(organizationId: string, taskId: string) {
      return workRequest(
        runtime,
        {
          method: 'GET',
          path: `${root(organizationId)}/${encodeURIComponent(taskId)}`,
        },
        workTaskSchema
      )
    },
    create(organizationId: string, input: CreateWorkTaskInput) {
      return workRequest(
        runtime,
        { method: 'POST', path: root(organizationId), body: input },
        workTaskSchema
      )
    },
    update(organizationId: string, taskId: string, input: UpdateWorkTaskInput) {
      return workRequest(
        runtime,
        {
          method: 'PATCH',
          path: `${root(organizationId)}/${encodeURIComponent(taskId)}`,
          body: input,
        },
        workTaskSchema
      )
    },
    delete(organizationId: string, taskId: string, deletedBy: string) {
      return workRequest(
        runtime,
        {
          method: 'DELETE',
          path: `${root(organizationId)}/${encodeURIComponent(taskId)}`,
          body: { deletedBy },
        },
        z.object({
          object: z.literal('task'),
          id: z.string(),
          deleted: z.literal(true),
        })
      )
    },
  }
}
