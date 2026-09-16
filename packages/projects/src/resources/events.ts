import { request } from '../request'
import type { Runtime } from '../runtime'
import {
  deletedSchema,
  eventAttendeeSchema,
  eventListSchema,
  projectEventSchema,
  type AddEventAttendeeInput,
  type CreateEventInput,
  type ListEventsQuery,
  type RequestOptions,
  type RespondEventAttendeeInput,
  type UpdateEventInput,
} from '../types'

function root(organizationId: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/events`
}

function toQueryString(query?: ListEventsQuery): string {
  if (!query?.projectId) return ''
  const search = new URLSearchParams()
  search.set('projectId', query.projectId)
  return `?${search.toString()}`
}

export function createEventsResource(runtime: Runtime) {
  return {
    list(organizationId: string, query: ListEventsQuery & RequestOptions = {}) {
      const { projectId, signal } = query
      return request(
        runtime,
        {
          method: 'GET',
          path: `${root(organizationId)}${toQueryString({ projectId })}`,
          signal,
        },
        eventListSchema
      )
    },
    create(
      organizationId: string,
      input: CreateEventInput,
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
        projectEventSchema
      )
    },
    retrieve(
      organizationId: string,
      eventId: string,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'GET',
          path: `${root(organizationId)}/${encodeURIComponent(eventId)}`,
          signal: options.signal,
        },
        projectEventSchema
      )
    },
    update(
      organizationId: string,
      eventId: string,
      input: UpdateEventInput,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'PATCH',
          path: `${root(organizationId)}/${encodeURIComponent(eventId)}`,
          body: input,
          signal: options.signal,
        },
        projectEventSchema
      )
    },
    delete(
      organizationId: string,
      eventId: string,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'DELETE',
          path: `${root(organizationId)}/${encodeURIComponent(eventId)}`,
          signal: options.signal,
        },
        deletedSchema
      )
    },
    addAttendee(
      organizationId: string,
      eventId: string,
      input: AddEventAttendeeInput,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'POST',
          path: `${root(organizationId)}/${encodeURIComponent(eventId)}/attendees`,
          body: input,
          signal: options.signal,
        },
        eventAttendeeSchema
      )
    },
    respondAttendee(
      organizationId: string,
      eventId: string,
      userId: string,
      input: RespondEventAttendeeInput,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'PATCH',
          path: `${root(organizationId)}/${encodeURIComponent(eventId)}/attendees/${encodeURIComponent(userId)}`,
          body: input,
          signal: options.signal,
        },
        eventAttendeeSchema
      )
    },
    removeAttendee(
      organizationId: string,
      eventId: string,
      userId: string,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'DELETE',
          path: `${root(organizationId)}/${encodeURIComponent(eventId)}/attendees/${encodeURIComponent(userId)}`,
          signal: options.signal,
        },
        deletedSchema
      )
    },
  }
}
