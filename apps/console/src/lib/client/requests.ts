import type { CrmOperatorClient } from '@876/crm/operator'

import { request } from './request'

type RequestsResource = CrmOperatorClient['requests']
type RequestTasksResource = CrmOperatorClient['requestTasks']
type RequestRemindersResource = CrmOperatorClient['requestReminders']
type RequestEventsResource = CrmOperatorClient['requestEvents']
type RequestNotesResource = CrmOperatorClient['requestNotes']
type CreateRequestInput = Parameters<RequestsResource['create']>[1]
type UpdateRequestInput = Parameters<RequestsResource['update']>[2]
type DeleteInput = Parameters<RequestsResource['delete']>[2]
type CrmRequest = NonNullable<
  Awaited<ReturnType<RequestsResource['retrieve']>>['data']
>
type Deleted = NonNullable<
  Awaited<ReturnType<RequestsResource['delete']>>['data']
>
type CreateRequestTaskInput = Parameters<RequestTasksResource['create']>[2]
type UpdateRequestTaskInput = Parameters<RequestTasksResource['update']>[3]
type DeleteNestedRequestInput = Parameters<RequestTasksResource['delete']>[3]
type RequestTask = NonNullable<
  Awaited<ReturnType<RequestTasksResource['create']>>['data']
>
type CreateRequestReminderInput = Parameters<
  RequestRemindersResource['create']
>[2]
type UpdateRequestReminderInput = Parameters<
  RequestRemindersResource['update']
>[3]
type RequestReminder = NonNullable<
  Awaited<ReturnType<RequestRemindersResource['create']>>['data']
>

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never

type CreateRequestEventInput = DistributiveOmit<
  Parameters<RequestEventsResource['create']>[2],
  'createdBy'
>
type UpdateRequestEventInput = Parameters<RequestEventsResource['update']>[3]
type RequestEvent = NonNullable<
  Awaited<ReturnType<RequestEventsResource['create']>>['data']
>

type CreateRequestNoteInput = Parameters<RequestNotesResource['create']>[2]
type UpdateRequestNoteInput = Parameters<RequestNotesResource['update']>[3]
type DeleteRequestNoteInput = Parameters<RequestNotesResource['delete']>[3]
type CrmRequestNote = NonNullable<
  Awaited<ReturnType<RequestNotesResource['create']>>['data']
>

function root(organizationId: string) {
  return `/api/organizations/${encodeURIComponent(organizationId)}/requests`
}

export const requests = {
  create(organizationId: string, params: CreateRequestInput) {
    return request<CrmRequest>(root(organizationId), {
      method: 'POST',
      body: JSON.stringify(params),
    })
  },
  update(
    organizationId: string,
    requestId: string,
    params: UpdateRequestInput
  ) {
    return request<CrmRequest>(
      `${root(organizationId)}/${encodeURIComponent(requestId)}`,
      { method: 'PATCH', body: JSON.stringify(params) }
    )
  },
  delete(organizationId: string, requestId: string, params: DeleteInput) {
    return request<Deleted>(
      `${root(organizationId)}/${encodeURIComponent(requestId)}`,
      { method: 'DELETE', body: JSON.stringify(params) }
    )
  },
}

export const requestTasks = {
  create(
    organizationId: string,
    requestId: string,
    params: CreateRequestTaskInput
  ) {
    return request<RequestTask>(
      `${root(organizationId)}/${encodeURIComponent(requestId)}/tasks`,
      { method: 'POST', body: JSON.stringify(params) }
    )
  },
  update(
    organizationId: string,
    requestId: string,
    taskId: string,
    params: UpdateRequestTaskInput
  ) {
    return request<RequestTask>(
      `${root(organizationId)}/${encodeURIComponent(requestId)}/tasks/${encodeURIComponent(taskId)}`,
      { method: 'PATCH', body: JSON.stringify(params) }
    )
  },
  delete(
    organizationId: string,
    requestId: string,
    taskId: string,
    params: DeleteNestedRequestInput
  ) {
    return request<Deleted>(
      `${root(organizationId)}/${encodeURIComponent(requestId)}/tasks/${encodeURIComponent(taskId)}`,
      { method: 'DELETE', body: JSON.stringify(params) }
    )
  },
}

export const requestReminders = {
  create(
    organizationId: string,
    requestId: string,
    params: CreateRequestReminderInput
  ) {
    return request<RequestReminder>(
      `${root(organizationId)}/${encodeURIComponent(requestId)}/reminders`,
      { method: 'POST', body: JSON.stringify(params) }
    )
  },
  update(
    organizationId: string,
    requestId: string,
    reminderId: string,
    params: UpdateRequestReminderInput
  ) {
    return request<RequestReminder>(
      `${root(organizationId)}/${encodeURIComponent(requestId)}/reminders/${encodeURIComponent(reminderId)}`,
      { method: 'PATCH', body: JSON.stringify(params) }
    )
  },
  delete(
    organizationId: string,
    requestId: string,
    reminderId: string,
    params: DeleteNestedRequestInput
  ) {
    return request<Deleted>(
      `${root(organizationId)}/${encodeURIComponent(requestId)}/reminders/${encodeURIComponent(reminderId)}`,
      { method: 'DELETE', body: JSON.stringify(params) }
    )
  },
}

export const requestEvents = {
  create(
    organizationId: string,
    requestId: string,
    params: CreateRequestEventInput
  ) {
    return request<RequestEvent>(
      `${root(organizationId)}/${encodeURIComponent(requestId)}/events`,
      { method: 'POST', body: JSON.stringify(params) }
    )
  },
  update(
    organizationId: string,
    requestId: string,
    eventId: string,
    params: UpdateRequestEventInput
  ) {
    return request<RequestEvent>(
      `${root(organizationId)}/${encodeURIComponent(requestId)}/events/${encodeURIComponent(eventId)}`,
      { method: 'PATCH', body: JSON.stringify(params) }
    )
  },
  delete(organizationId: string, requestId: string, eventId: string) {
    return request<Deleted>(
      `${root(organizationId)}/${encodeURIComponent(requestId)}/events/${encodeURIComponent(eventId)}`,
      { method: 'DELETE' }
    )
  },
}

export const requestNotes = {
  create(
    organizationId: string,
    requestId: string,
    params: CreateRequestNoteInput
  ) {
    return request<CrmRequestNote>(
      `${root(organizationId)}/${encodeURIComponent(requestId)}/notes`,
      { method: 'POST', body: JSON.stringify(params) }
    )
  },
  update(
    organizationId: string,
    requestId: string,
    noteId: string,
    params: UpdateRequestNoteInput
  ) {
    return request<CrmRequestNote>(
      `${root(organizationId)}/${encodeURIComponent(requestId)}/notes/${encodeURIComponent(noteId)}`,
      { method: 'PATCH', body: JSON.stringify(params) }
    )
  },
  delete(
    organizationId: string,
    requestId: string,
    noteId: string,
    params: DeleteRequestNoteInput
  ) {
    return request<Deleted>(
      `${root(organizationId)}/${encodeURIComponent(requestId)}/notes/${encodeURIComponent(noteId)}`,
      { method: 'DELETE', body: JSON.stringify(params) }
    )
  },
}
