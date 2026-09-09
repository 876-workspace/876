import { z } from 'zod'

import {
  workEventResourceListSchema,
  workEventResourceSchema,
  type CreateWorkEventResourceInput,
  type UpdateWorkEventResourceInput,
  type WorkEventResourceListFilter,
} from '../event-contracts'
import type { WorkRecurrenceDraft } from '../recurrence-contracts'
import { workRequest } from '../request'
import type { WorkRuntime } from '../runtime'
import { workRecurrenceRuleSchema } from '../types'

function root(organizationId: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/events`
}

function listPath(organizationId: string, filter: WorkEventResourceListFilter) {
  const params = new URLSearchParams()
  if (filter.calendarId) params.set('calendar_id', filter.calendarId)
  if (filter.context) {
    params.set('context_service', filter.context.service)
    params.set('context_resource', filter.context.resource)
    params.set('context_id', filter.context.id)
  }
  if (filter.from) params.set('from', String(filter.from))
  if (filter.to) params.set('to', String(filter.to))
  if (filter.status) params.set('status', filter.status)
  if (filter.limit) params.set('limit', String(filter.limit))
  if (filter.startingAfter) params.set('starting_after', filter.startingAfter)
  if (filter.endingBefore) params.set('ending_before', filter.endingBefore)
  const query = params.toString()
  return `${root(organizationId)}${query ? `?${query}` : ''}`
}

function itemPath(organizationId: string, eventId: string) {
  return `${root(organizationId)}/${encodeURIComponent(eventId)}`
}

export function createEventsResource(runtime: WorkRuntime) {
  return {
    list(organizationId: string, filter: WorkEventResourceListFilter = {}) {
      return workRequest(
        runtime,
        { method: 'GET', path: listPath(organizationId, filter) },
        workEventResourceListSchema
      )
    },
    retrieve(organizationId: string, eventId: string) {
      return workRequest(
        runtime,
        { method: 'GET', path: itemPath(organizationId, eventId) },
        workEventResourceSchema
      )
    },
    create(organizationId: string, input: CreateWorkEventResourceInput) {
      return workRequest(
        runtime,
        { method: 'POST', path: root(organizationId), body: input },
        workEventResourceSchema
      )
    },
    update(
      organizationId: string,
      eventId: string,
      input: UpdateWorkEventResourceInput
    ) {
      return workRequest(
        runtime,
        {
          method: 'PATCH',
          path: itemPath(organizationId, eventId),
          body: input,
        },
        workEventResourceSchema
      )
    },
    recurrence: {
      retrieve(organizationId: string, eventId: string) {
        return workRequest(
          runtime,
          {
            method: 'GET',
            path: `${itemPath(organizationId, eventId)}/recurrence`,
          },
          workRecurrenceRuleSchema.nullable()
        )
      },
      set(organizationId: string, eventId: string, input: WorkRecurrenceDraft) {
        return workRequest(
          runtime,
          {
            method: 'PATCH',
            path: `${itemPath(organizationId, eventId)}/recurrence`,
            body: input,
          },
          workRecurrenceRuleSchema
        )
      },
      clear(organizationId: string, eventId: string) {
        return workRequest(
          runtime,
          {
            method: 'DELETE',
            path: `${itemPath(organizationId, eventId)}/recurrence`,
          },
          workEventResourceSchema
        )
      },
    },
    delete(organizationId: string, eventId: string, deletedBy: string) {
      return workRequest(
        runtime,
        {
          method: 'DELETE',
          path: itemPath(organizationId, eventId),
          body: { deletedBy },
        },
        z.object({
          object: z.literal('event'),
          id: z.string(),
          deleted: z.literal(true),
        })
      )
    },
  }
}
