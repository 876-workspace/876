'use client'

import type {
  AddEventAttendeeInput,
  AttendeeResponse,
  CreateEventInput,
  EventAttendee,
  ProjectEvent,
  UpdateEventInput,
} from '@876/projects/contracts'

import { request } from './request'

type CreateEventParams = Omit<CreateEventInput, 'createdBy'>

export const eventsClient = {
  create(params: CreateEventParams) {
    return request<ProjectEvent>('/api/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(params),
    })
  },
  update(eventId: string, params: UpdateEventInput) {
    return request<ProjectEvent>(`/api/events/${encodeURIComponent(eventId)}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(params),
    })
  },
  delete(eventId: string) {
    return request<{ object: string; id: string; deleted: true }>(
      `/api/events/${encodeURIComponent(eventId)}`,
      { method: 'DELETE' }
    )
  },
  addAttendee(eventId: string, params: AddEventAttendeeInput) {
    return request<EventAttendee>(
      `/api/events/${encodeURIComponent(eventId)}/attendees`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(params),
      }
    )
  },
  respondAttendee(eventId: string, userId: string, response: AttendeeResponse) {
    return request<EventAttendee>(
      `/api/events/${encodeURIComponent(eventId)}/attendees/${encodeURIComponent(userId)}`,
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ response }),
      }
    )
  },
  removeAttendee(eventId: string, userId: string) {
    return request<{ object: string; id: string; deleted: true }>(
      `/api/events/${encodeURIComponent(eventId)}/attendees/${encodeURIComponent(userId)}`,
      { method: 'DELETE' }
    )
  },
}
