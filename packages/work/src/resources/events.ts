import { z } from 'zod'

import { workRequest } from '../request'
import type { WorkRuntime } from '../runtime'
import {
  workEventListSchema,
  workEventSchema,
  type CreateWorkEventInput,
  type UpdateWorkEventInput,
  type WorkEventListFilter,
} from '../types'

function root(organizationId: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/events`
}

function listPath(organizationId: string, filter: WorkEventListFilter) {
  const params = new URLSearchParams()
  if (filter.calendarId) params.set('calendar_id', filter.calendarId)
  if (filter.from) params.set('from', String(filter.from))
  if (filter.to) params.set('to', String(filter.to))
  if (filter.status) params.set('status', filter.status)
  if (filter.limit) params.set('limit', String(filter.limit))
  if (filter.startingAfter) params.set('starting_after', filter.startingAfter)
  if (filter.endingBefore) params.set('ending_before', filter.endingBefore)
  const query = params.toString()
  return `${root(organizationId)}${query ? `?${query}` : ''}`
}

export function createEventsResource(runtime: WorkRuntime) {
  return {
    list(organizationId: string, filter: WorkEventListFilter = {}) {
      return workRequest(runtime, { method: 'GET', path: listPath(organizationId, filter) }, workEventListSchema)
    },
    retrieve(organizationId: string, eventId: string) {
      return workRequest(runtime, { method: 'GET', path: `${root(organizationId)}/${encodeURIComponent(eventId)}` }, workEventSchema)
    },
    create(organizationId: string, input: CreateWorkEventInput) {
      return workRequest(runtime, { method: 'POST', path: root(organizationId), body: input }, workEventSchema)
    },
    update(organizationId: string, eventId: string, input: UpdateWorkEventInput) {
      return workRequest(runtime, { method: 'PATCH', path: `${root(organizationId)}/${encodeURIComponent(eventId)}`, body: input }, workEventSchema)
    },
    delete(organizationId: string, eventId: string, deletedBy: string) {
      return workRequest(runtime, { method: 'DELETE', path: `${root(organizationId)}/${encodeURIComponent(eventId)}`, body: { deletedBy } }, z.object({ object: z.literal('event'), id: z.string(), deleted: z.literal(true) }))
    },
  }
}
