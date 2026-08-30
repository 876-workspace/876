import { z } from 'zod'

import { request } from '../request'
import type { Runtime } from '../runtime'
import {
  requestEventListSchema,
  requestEventParticipantListSchema,
  requestEventParticipantSchema,
  requestEventSchema,
  type CreateRequestEventInput,
  type CreateRequestEventParticipantInput,
  type UpdateRequestEventInput,
  type UpdateRequestEventParticipantInput,
} from '../request-event-types'
import {
  deletedSchema,
  type DeleteNestedRequestInput,
  type RequestOptions,
} from '../types'

function root(organizationId: string, requestId: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/requests/${encodeURIComponent(requestId)}/events`
}

function participantRoot(
  organizationId: string,
  requestId: string,
  eventId: string
) {
  return `${root(organizationId, requestId)}/${encodeURIComponent(eventId)}/participants`
}

export function createRequestEventsResource(runtime: Runtime) {
  return {
    list(
      organizationId: string,
      requestId: string,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'GET',
          path: root(organizationId, requestId),
          signal: options.signal,
        },
        requestEventListSchema
      )
    },
    retrieve(
      organizationId: string,
      requestId: string,
      eventId: string,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'GET',
          path: `${root(organizationId, requestId)}/${encodeURIComponent(eventId)}`,
          signal: options.signal,
        },
        requestEventSchema
      )
    },
    create(
      organizationId: string,
      requestId: string,
      input: CreateRequestEventInput,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'POST',
          path: root(organizationId, requestId),
          body: input,
          signal: options.signal,
        },
        requestEventSchema
      )
    },
    update(
      organizationId: string,
      requestId: string,
      eventId: string,
      input: UpdateRequestEventInput,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'PATCH',
          path: `${root(organizationId, requestId)}/${encodeURIComponent(eventId)}`,
          body: input,
          signal: options.signal,
        },
        requestEventSchema
      )
    },
    delete(
      organizationId: string,
      requestId: string,
      eventId: string,
      input: DeleteNestedRequestInput,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'DELETE',
          path: `${root(organizationId, requestId)}/${encodeURIComponent(eventId)}`,
          body: input,
          signal: options.signal,
        },
        deletedSchema.extend({ object: z.literal('request_event') })
      )
    },
    participants: {
      list(
        organizationId: string,
        requestId: string,
        eventId: string,
        options: RequestOptions = {}
      ) {
        return request(
          runtime,
          {
            method: 'GET',
            path: participantRoot(organizationId, requestId, eventId),
            signal: options.signal,
          },
          requestEventParticipantListSchema
        )
      },
      create(
        organizationId: string,
        requestId: string,
        eventId: string,
        input: CreateRequestEventParticipantInput,
        options: RequestOptions = {}
      ) {
        return request(
          runtime,
          {
            method: 'POST',
            path: participantRoot(organizationId, requestId, eventId),
            body: input,
            signal: options.signal,
          },
          requestEventParticipantSchema
        )
      },
      update(
        organizationId: string,
        requestId: string,
        eventId: string,
        participantId: string,
        input: UpdateRequestEventParticipantInput,
        options: RequestOptions = {}
      ) {
        return request(
          runtime,
          {
            method: 'PATCH',
            path: `${participantRoot(organizationId, requestId, eventId)}/${encodeURIComponent(participantId)}`,
            body: input,
            signal: options.signal,
          },
          requestEventParticipantSchema
        )
      },
      delete(
        organizationId: string,
        requestId: string,
        eventId: string,
        participantId: string,
        options: RequestOptions = {}
      ) {
        return request(
          runtime,
          {
            method: 'DELETE',
            path: `${participantRoot(organizationId, requestId, eventId)}/${encodeURIComponent(participantId)}`,
            signal: options.signal,
          },
          deletedSchema.extend({
            object: z.literal('request_event_participant'),
          })
        )
      },
    },
  }
}
