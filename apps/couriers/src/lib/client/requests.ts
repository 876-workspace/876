'use client'

import type {
  CreateRequestEventInput,
  CreateRequestForBillingCustomerInput,
  CreateRequestTaskInput,
  CrmRequest,
  RequestEvent,
  RequestTask,
  UpdateRequestInput,
} from '@876/crm'

import { request } from './request'

type CreateRequestInput = Omit<
  CreateRequestForBillingCustomerInput,
  'createdBy'
>
type CreateRequestTaskClientInput = Omit<CreateRequestTaskInput, 'createdBy'>
type CreateRequestEventClientInput = Omit<CreateRequestEventInput, 'createdBy'>

const create = (
  orgSlug: string,
  customerId: string,
  input: CreateRequestInput
) =>
  request<CrmRequest>('/api/manage/requests', {
    method: 'POST',
    body: JSON.stringify({ orgSlug, customerId, ...input }),
  })

const update = (
  orgSlug: string,
  requestId: string,
  input: UpdateRequestInput
) =>
  request<CrmRequest>(`/api/manage/requests/${encodeURIComponent(requestId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ orgSlug, ...input }),
  })

const createTask = (
  orgSlug: string,
  requestId: string,
  input: CreateRequestTaskClientInput
) =>
  request<RequestTask>(
    `/api/manage/requests/${encodeURIComponent(requestId)}/tasks`,
    {
      method: 'POST',
      body: JSON.stringify({ orgSlug, ...input }),
    }
  )

const createEvent = (
  orgSlug: string,
  requestId: string,
  input: CreateRequestEventClientInput
) =>
  request<RequestEvent>(
    `/api/manage/requests/${encodeURIComponent(requestId)}/events`,
    {
      method: 'POST',
      body: JSON.stringify({ orgSlug, ...input }),
    }
  )

const deleteEvent = (orgSlug: string, requestId: string, eventId: string) =>
  request<{ id: string }>(
    `/api/manage/requests/${encodeURIComponent(requestId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: 'DELETE',
      body: JSON.stringify({ orgSlug }),
    }
  )

export const requests = {
  create,
  update,
  tasks: { create: createTask },
  events: { create: createEvent, delete: deleteEvent },
}
