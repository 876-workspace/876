import { z } from 'zod'

import { workRequest } from '../request'
import type { WorkRuntime } from '../runtime'
import {
  workCalendarSubscriptionListSchema,
  workCalendarSubscriptionSchema,
  type CreateWorkCalendarSubscriptionInput,
  type UpdateWorkCalendarSubscriptionInput,
} from '../types'

function root(organizationId: string, calendarId: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/calendars/${encodeURIComponent(calendarId)}/subscriptions`
}

export function createCalendarSubscriptionsResource(runtime: WorkRuntime) {
  return {
    list(organizationId: string, calendarId: string) {
      return workRequest(runtime, { method: 'GET', path: root(organizationId, calendarId) }, workCalendarSubscriptionListSchema)
    },
    create(organizationId: string, calendarId: string, input: CreateWorkCalendarSubscriptionInput) {
      return workRequest(runtime, { method: 'POST', path: root(organizationId, calendarId), body: input }, workCalendarSubscriptionSchema)
    },
    update(organizationId: string, calendarId: string, subscriptionId: string, input: UpdateWorkCalendarSubscriptionInput) {
      return workRequest(runtime, { method: 'PATCH', path: `${root(organizationId, calendarId)}/${encodeURIComponent(subscriptionId)}`, body: input }, workCalendarSubscriptionSchema)
    },
    delete(organizationId: string, calendarId: string, subscriptionId: string) {
      return workRequest(runtime, { method: 'DELETE', path: `${root(organizationId, calendarId)}/${encodeURIComponent(subscriptionId)}` }, z.object({ object: z.literal('calendar_subscription'), id: z.string(), deleted: z.literal(true) }))
    },
  }
}
