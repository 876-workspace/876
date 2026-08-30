import { z } from 'zod'

import { workRequest } from '../request'
import type { WorkRuntime } from '../runtime'
import {
  workCalendarListSchema,
  workCalendarSchema,
  type CreateWorkCalendarInput,
  type UpdateWorkCalendarInput,
  type WorkCalendarListFilter,
} from '../types'

function root(organizationId: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/calendars`
}

function listPath(organizationId: string, filter: WorkCalendarListFilter) {
  const params = new URLSearchParams()
  if (filter.userId) params.set('user_id', filter.userId)
  if (filter.visibility) params.set('visibility', filter.visibility)
  if (filter.limit) params.set('limit', String(filter.limit))
  if (filter.startingAfter) params.set('starting_after', filter.startingAfter)
  if (filter.endingBefore) params.set('ending_before', filter.endingBefore)
  const query = params.toString()
  return `${root(organizationId)}${query ? `?${query}` : ''}`
}

export function createCalendarsResource(runtime: WorkRuntime) {
  return {
    list(organizationId: string, filter: WorkCalendarListFilter = {}) {
      return workRequest(
        runtime,
        { method: 'GET', path: listPath(organizationId, filter) },
        workCalendarListSchema
      )
    },
    retrieve(organizationId: string, calendarId: string) {
      return workRequest(
        runtime,
        {
          method: 'GET',
          path: `${root(organizationId)}/${encodeURIComponent(calendarId)}`,
        },
        workCalendarSchema
      )
    },
    create(organizationId: string, input: CreateWorkCalendarInput) {
      return workRequest(
        runtime,
        { method: 'POST', path: root(organizationId), body: input },
        workCalendarSchema
      )
    },
    ensurePrimary(
      organizationId: string,
      input: { userId: string; timeZone: string }
    ) {
      return workRequest(
        runtime,
        {
          method: 'POST',
          path: `${root(organizationId)}/primary`,
          body: input,
        },
        workCalendarSchema
      )
    },
    update(
      organizationId: string,
      calendarId: string,
      input: UpdateWorkCalendarInput
    ) {
      return workRequest(
        runtime,
        {
          method: 'PATCH',
          path: `${root(organizationId)}/${encodeURIComponent(calendarId)}`,
          body: input,
        },
        workCalendarSchema
      )
    },
    delete(organizationId: string, calendarId: string, deletedBy: string) {
      return workRequest(
        runtime,
        {
          method: 'DELETE',
          path: `${root(organizationId)}/${encodeURIComponent(calendarId)}`,
          body: { deletedBy },
        },
        z.object({
          object: z.literal('calendar'),
          id: z.string(),
          deleted: z.literal(true),
        })
      )
    },
  }
}
