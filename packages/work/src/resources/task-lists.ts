import { z } from 'zod'

import { workRequest } from '../request'
import type { WorkRuntime } from '../runtime'
import {
  workTaskListResourceListSchema,
  workTaskListResourceSchema,
  type CreateWorkTaskListInput,
  type UpdateWorkTaskListInput,
  type WorkTaskListResourceFilter,
} from '../types'

function root(organizationId: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/task-lists`
}

function listPath(organizationId: string, filter: WorkTaskListResourceFilter) {
  const params = new URLSearchParams()
  if (filter.ownerUserId) params.set('owner_user_id', filter.ownerUserId)
  if (filter.limit) params.set('limit', String(filter.limit))
  if (filter.startingAfter) params.set('starting_after', filter.startingAfter)
  if (filter.endingBefore) params.set('ending_before', filter.endingBefore)
  const query = params.toString()
  return `${root(organizationId)}${query ? `?${query}` : ''}`
}

export function createTaskListsResource(runtime: WorkRuntime) {
  return {
    list(organizationId: string, filter: WorkTaskListResourceFilter = {}) {
      return workRequest(runtime, { method: 'GET', path: listPath(organizationId, filter) }, workTaskListResourceListSchema)
    },
    retrieve(organizationId: string, listId: string) {
      return workRequest(runtime, { method: 'GET', path: `${root(organizationId)}/${encodeURIComponent(listId)}` }, workTaskListResourceSchema)
    },
    create(organizationId: string, input: CreateWorkTaskListInput) {
      return workRequest(runtime, { method: 'POST', path: root(organizationId), body: input }, workTaskListResourceSchema)
    },
    update(organizationId: string, listId: string, input: UpdateWorkTaskListInput) {
      return workRequest(runtime, { method: 'PATCH', path: `${root(organizationId)}/${encodeURIComponent(listId)}`, body: input }, workTaskListResourceSchema)
    },
    delete(organizationId: string, listId: string, deletedBy: string) {
      return workRequest(runtime, { method: 'DELETE', path: `${root(organizationId)}/${encodeURIComponent(listId)}`, body: { deletedBy } }, z.object({ object: z.literal('task_list'), id: z.string(), deleted: z.literal(true) }))
    },
  }
}
