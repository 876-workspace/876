'use client'

import type {
  CrmRequestEvent,
  CrmRequestEventCreateInput,
  CrmRequestEventList,
  CrmRequestEventParticipant,
  CrmRequestEventParticipantCreateInput,
  CrmRequestEventParticipantUpdateInput,
  CrmRequestEventUpdateInput,
} from '@/types/crm'
import { request } from './request'

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never
export type RequestEventCreateInput = DistributiveOmit<
  CrmRequestEventCreateInput,
  'createdBy'
>
function root(requestId: string) {
  return `/api/requests/${encodeURIComponent(requestId)}/events`
}
function participantRoot(requestId: string, eventId: string) {
  return `${root(requestId)}/${encodeURIComponent(eventId)}/participants`
}

export const requestEvents = {
  list(requestId: string) {
    return request<CrmRequestEventList>(root(requestId))
  },
  retrieve(requestId: string, eventId: string) {
    return request<CrmRequestEvent>(
      `${root(requestId)}/${encodeURIComponent(eventId)}`
    )
  },
  create(requestId: string, params: RequestEventCreateInput) {
    return request<CrmRequestEvent>(root(requestId), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(params),
    })
  },
  update(
    requestId: string,
    eventId: string,
    params: CrmRequestEventUpdateInput
  ) {
    return request<CrmRequestEvent>(
      `${root(requestId)}/${encodeURIComponent(eventId)}`,
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(params),
      }
    )
  },
  delete(requestId: string, eventId: string) {
    return request<{ object: 'request_event'; id: string; deleted: true }>(
      `${root(requestId)}/${encodeURIComponent(eventId)}`,
      { method: 'DELETE' }
    )
  },
  participants: {
    list(requestId: string, eventId: string) {
      return request<{
        object: 'list'
        data: CrmRequestEventParticipant[]
        has_more: boolean
        total_count: number | null
        url: string
      }>(participantRoot(requestId, eventId))
    },
    create(
      requestId: string,
      eventId: string,
      params: CrmRequestEventParticipantCreateInput
    ) {
      return request<CrmRequestEventParticipant>(
        participantRoot(requestId, eventId),
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(params),
        }
      )
    },
    update(
      requestId: string,
      eventId: string,
      participantId: string,
      params: CrmRequestEventParticipantUpdateInput
    ) {
      return request<CrmRequestEventParticipant>(
        `${participantRoot(requestId, eventId)}/${encodeURIComponent(participantId)}`,
        {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(params),
        }
      )
    },
    delete(requestId: string, eventId: string, participantId: string) {
      return request<{
        object: 'request_event_participant'
        id: string
        deleted: true
      }>(
        `${participantRoot(requestId, eventId)}/${encodeURIComponent(participantId)}`,
        { method: 'DELETE' }
      )
    },
  },
}
