import { z } from 'zod'

import { workRequest } from '../request'
import type { WorkRuntime } from '../runtime'
import {
  workAlertListSchema,
  workAlertSchema,
  type CreateWorkAlertInput,
  type UpdateWorkAlertInput,
  type WorkAlertListFilter,
} from '../types'

function root(organizationId: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/alerts`
}

function listPath(organizationId: string, filter: WorkAlertListFilter) {
  const params = new URLSearchParams()
  if (filter.taskId) params.set('task_id', filter.taskId)
  if (filter.eventId) params.set('event_id', filter.eventId)
  if (filter.userId) params.set('user_id', filter.userId)
  if (filter.status) params.set('status', filter.status)
  if (filter.limit) params.set('limit', String(filter.limit))
  if (filter.startingAfter) params.set('starting_after', filter.startingAfter)
  if (filter.endingBefore) params.set('ending_before', filter.endingBefore)
  const query = params.toString()
  return `${root(organizationId)}${query ? `?${query}` : ''}`
}

export function createAlertsResource(runtime: WorkRuntime) {
  return {
    list(organizationId: string, filter: WorkAlertListFilter = {}) {
      return workRequest(
        runtime,
        { method: 'GET', path: listPath(organizationId, filter) },
        workAlertListSchema
      )
    },
    retrieve(organizationId: string, alertId: string) {
      return workRequest(
        runtime,
        {
          method: 'GET',
          path: `${root(organizationId)}/${encodeURIComponent(alertId)}`,
        },
        workAlertSchema
      )
    },
    create(organizationId: string, input: CreateWorkAlertInput) {
      return workRequest(
        runtime,
        { method: 'POST', path: root(organizationId), body: input },
        workAlertSchema
      )
    },
    update(
      organizationId: string,
      alertId: string,
      input: UpdateWorkAlertInput
    ) {
      return workRequest(
        runtime,
        {
          method: 'PATCH',
          path: `${root(organizationId)}/${encodeURIComponent(alertId)}`,
          body: input,
        },
        workAlertSchema
      )
    },
    delete(organizationId: string, alertId: string) {
      return workRequest(
        runtime,
        {
          method: 'DELETE',
          path: `${root(organizationId)}/${encodeURIComponent(alertId)}`,
        },
        z.object({
          object: z.literal('alert'),
          id: z.string(),
          deleted: z.literal(true),
        })
      )
    },
  }
}
