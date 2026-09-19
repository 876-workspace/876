import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getManageContext: vi.fn(),
  crm: {
    requests: {
      createForBillingCustomer: vi.fn(),
      update: vi.fn(),
    },
    requestTasks: { create: vi.fn() },
    requestEvents: { create: vi.fn(), delete: vi.fn() },
  },
}))

vi.mock('@/lib/auth/manage-context', () => ({
  getManageContext: mocks.getManageContext,
}))
vi.mock('@/lib/clients/crm', () => ({ crm: mocks.crm }))

import { POST as createRequest } from './route'
import { PATCH as updateRequest } from './[requestId]/route'
import { POST as createTask } from './[requestId]/tasks/route'
import { POST as createEvent } from './[requestId]/events/route'
import { DELETE as deleteEvent } from './[requestId]/events/[eventId]/route'

const params = Promise.resolve({ requestId: 'req_1' })
const eventParams = Promise.resolve({ requestId: 'req_1', eventId: 'event_1' })

function jsonRequest(body: unknown, method = 'POST') {
  return new Request('http://couriers.test/api/manage/requests', {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function context(role: 'admin' | 'staff' = 'admin') {
  return {
    role,
    userId: 'usr_1',
    orgId: 'org_1',
    orgName: 'Acme',
    orgSlug: 'acme',
    orgLogoUrl: null,
    organizations: [],
    tenant: null,
    accessStatus: 'active' as const,
  }
}

describe('Couriers request mutation routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getManageContext.mockResolvedValue(context())
    mocks.crm.requests.createForBillingCustomer.mockResolvedValue({
      data: { id: 'req_1' },
      error: null,
    })
    mocks.crm.requests.update.mockResolvedValue({
      data: { id: 'req_1', status: 'RESOLVED' },
      error: null,
    })
    mocks.crm.requestTasks.create.mockResolvedValue({
      data: { id: 'task_1' },
      error: null,
    })
    mocks.crm.requestEvents.create.mockResolvedValue({
      data: { id: 'event_1' },
      error: null,
    })
    mocks.crm.requestEvents.delete.mockResolvedValue({
      data: { id: 'event_1' },
      error: null,
    })
  })

  it('returns 403 without calling CRM when creating a request is unauthorized', async () => {
    mocks.getManageContext.mockResolvedValue(context('staff'))

    const response = await createRequest(
      jsonRequest({ orgSlug: 'acme', customerId: 'cus_1', subject: 'Help' })
    )

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({
      data: null,
      error: {
        code: 'auth/forbidden',
        message: 'You do not have permission to perform this action.',
      },
    })
    expect(mocks.crm.requests.createForBillingCustomer).not.toHaveBeenCalled()
  })

  it('returns a success envelope when creating a request', async () => {
    const response = await createRequest(
      jsonRequest({ orgSlug: 'acme', customerId: 'cus_1', subject: ' Help ' })
    )

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({
      data: { id: 'req_1' },
      error: null,
    })
    expect(mocks.crm.requests.createForBillingCustomer).toHaveBeenCalledWith(
      'org_1',
      'cus_1',
      { subject: 'Help', createdBy: 'usr_1' }
    )
  })

  it('passes a registered CRM error through when creating a request fails', async () => {
    mocks.crm.requests.createForBillingCustomer.mockResolvedValue({
      data: null,
      error: { code: 'crm/customer-not-found', message: 'internal text' },
    })

    const response = await createRequest(
      jsonRequest({ orgSlug: 'acme', customerId: 'cus_1', subject: 'Help' })
    )

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({
      data: null,
      error: { code: 'crm/customer-not-found', message: 'Customer not found.' },
    })
  })

  it('returns 403 without calling CRM when updating a request is unauthorized', async () => {
    mocks.getManageContext.mockResolvedValue(context('staff'))

    const response = await updateRequest(
      jsonRequest({ orgSlug: 'acme', status: 'RESOLVED' }, 'PATCH'),
      { params }
    )

    expect(response.status).toBe(403)
    expect(mocks.crm.requests.update).not.toHaveBeenCalled()
  })

  it('returns a success envelope when updating a request', async () => {
    const response = await updateRequest(
      jsonRequest({ orgSlug: 'acme', status: 'RESOLVED' }, 'PATCH'),
      { params }
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      data: { id: 'req_1', status: 'RESOLVED' },
      error: null,
    })
    expect(mocks.crm.requests.update).toHaveBeenCalledWith('org_1', 'req_1', {
      status: 'RESOLVED',
    })
  })

  it('passes a registered CRM error through when updating a request fails', async () => {
    mocks.crm.requests.update.mockResolvedValue({
      data: null,
      error: { code: 'crm/request-not-found', message: 'internal text' },
    })

    const response = await updateRequest(
      jsonRequest({ orgSlug: 'acme', status: 'RESOLVED' }, 'PATCH'),
      { params }
    )

    expect(response.status).toBe(404)
    expect((await response.json()).error).toEqual({
      code: 'crm/request-not-found',
      message: 'Request not found.',
    })
  })

  it('returns 403 without calling CRM when creating a task is unauthorized', async () => {
    mocks.getManageContext.mockResolvedValue(context('staff'))

    const response = await createTask(
      jsonRequest({ orgSlug: 'acme', title: 'Follow up' }),
      { params }
    )

    expect(response.status).toBe(403)
    expect(mocks.crm.requestTasks.create).not.toHaveBeenCalled()
  })

  it('returns a success envelope when creating a task', async () => {
    const response = await createTask(
      jsonRequest({ orgSlug: 'acme', title: 'Follow up' }),
      { params }
    )

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({
      data: { id: 'task_1' },
      error: null,
    })
  })

  it('passes a registered CRM error through when creating a task fails', async () => {
    mocks.crm.requestTasks.create.mockResolvedValue({
      data: null,
      error: { code: 'crm/task-not-found', message: 'internal text' },
    })

    const response = await createTask(
      jsonRequest({ orgSlug: 'acme', title: 'Follow up' }),
      { params }
    )

    expect(response.status).toBe(404)
    expect((await response.json()).error).toEqual({
      code: 'crm/task-not-found',
      message: 'Request task not found.',
    })
  })

  it('returns 403 without calling CRM when creating an event is unauthorized', async () => {
    mocks.getManageContext.mockResolvedValue(context('staff'))

    const response = await createEvent(
      jsonRequest({
        orgSlug: 'acme',
        title: 'Call customer',
        allDay: false,
        startAt: 100,
        endAt: 200,
        timeZone: 'UTC',
      }),
      { params }
    )

    expect(response.status).toBe(403)
    expect(mocks.crm.requestEvents.create).not.toHaveBeenCalled()
  })

  it('returns a success envelope when creating an event', async () => {
    const response = await createEvent(
      jsonRequest({
        orgSlug: 'acme',
        title: 'Call customer',
        allDay: false,
        startAt: 100,
        endAt: 200,
        timeZone: 'UTC',
      }),
      { params }
    )

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({
      data: { id: 'event_1' },
      error: null,
    })
  })

  it('passes a registered CRM error through when creating an event fails', async () => {
    mocks.crm.requestEvents.create.mockResolvedValue({
      data: null,
      error: { code: 'crm/request-not-found', message: 'internal text' },
    })

    const response = await createEvent(
      jsonRequest({
        orgSlug: 'acme',
        title: 'Call customer',
        allDay: false,
        startAt: 100,
        endAt: 200,
        timeZone: 'UTC',
      }),
      { params }
    )

    expect(response.status).toBe(404)
    expect((await response.json()).error.code).toBe('crm/request-not-found')
  })

  it('returns 403 without calling CRM when deleting an event is unauthorized', async () => {
    mocks.getManageContext.mockResolvedValue(context('staff'))

    const response = await deleteEvent(
      jsonRequest({ orgSlug: 'acme' }, 'DELETE'),
      { params: eventParams }
    )

    expect(response.status).toBe(403)
    expect(mocks.crm.requestEvents.delete).not.toHaveBeenCalled()
  })

  it('returns a success envelope when deleting an event', async () => {
    const response = await deleteEvent(
      jsonRequest({ orgSlug: 'acme' }, 'DELETE'),
      { params: eventParams }
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      data: { id: 'event_1' },
      error: null,
    })
    expect(mocks.crm.requestEvents.delete).toHaveBeenCalledWith(
      'org_1',
      'req_1',
      'event_1',
      { deletedBy: 'usr_1' }
    )
  })

  it('passes a registered CRM error through when deleting an event fails', async () => {
    mocks.crm.requestEvents.delete.mockResolvedValue({
      data: null,
      error: { code: 'crm/event-not-found', message: 'internal text' },
    })

    const response = await deleteEvent(
      jsonRequest({ orgSlug: 'acme' }, 'DELETE'),
      { params: eventParams }
    )

    expect(response.status).toBe(404)
    expect((await response.json()).error).toEqual({
      code: 'crm/event-not-found',
      message: 'Request event not found.',
    })
  })
})
