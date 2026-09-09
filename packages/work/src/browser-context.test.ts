import { afterEach, describe, expect, it, vi } from 'vitest'

import { browserWork } from './browser'

const INVOICE_CONTEXT = {
  service: 'billing',
  resource: 'invoice',
  externalId: 'inv/123',
  label: 'INV-123',
  url: '/invoices/inv%2F123',
} as const

function success(data: unknown) {
  return Response.json({ data, error: null }, { status: 200 })
}

describe('browserWork context transport', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('retrieves direct resource Work through the same-origin host route', async () => {
    const data = {
      object: 'resource_work',
      organizationId: 'org_1',
      context: INVOICE_CONTEXT,
      from: 100,
      to: 200,
      tasks: [],
      reminders: [],
      events: [],
      overdueTasks: [],
    }
    const fetchMock = vi.fn().mockResolvedValue(success(data))
    vi.stubGlobal('fetch', fetchMock)

    const result = await browserWork.resourceWork.retrieve({
      from: 100,
      to: 200,
      context: INVOICE_CONTEXT,
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      '/api/resource-work?from=100&to=200&contextService=billing&contextResource=invoice&contextId=inv%2F123'
    )
    expect(String(fetchMock.mock.calls[0]?.[0])).not.toContain('/v1/')
    expect(result).toEqual({ data, error: null })
  })

  it('scopes task pagination to the active resource', async () => {
    const page = {
      object: 'list',
      data: [],
      has_more: false,
      total_count: 0,
      url: '/tasks',
    }
    const fetchMock = vi.fn().mockResolvedValue(success(page))
    vi.stubGlobal('fetch', fetchMock)

    await browserWork.tasks.list({
      context: INVOICE_CONTEXT,
      listId: 'list/1',
      startingAfter: 'task/25',
    })

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      '/api/tasks?contextService=billing&contextResource=invoice&contextId=inv%2F123&listId=list%2F1&startingAfter=task%2F25'
    )
  })

  it('puts contextual task identity in the query and not the create body', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(success({ object: 'task', id: 'task_1' }))
    vi.stubGlobal('fetch', fetchMock)
    const input = { title: 'Fetch records' }

    await browserWork.tasks.create(input, INVOICE_CONTEXT)

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      '/api/tasks?contextService=billing&contextResource=invoice&contextId=inv%2F123'
    )
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: 'POST',
      body: JSON.stringify(input),
    })
    expect(String(fetchMock.mock.calls[0]?.[1]?.body)).not.toContain('inv/123')
    expect(String(fetchMock.mock.calls[0]?.[1]?.body)).not.toContain('createdBy')
  })

  it('puts contextual event identity in the query and not the create body', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(success({ object: 'event', id: 'event_1' }))
    vi.stubGlobal('fetch', fetchMock)
    const input = {
      title: 'Customer call',
      calendarId: 'cal_1',
      allDay: false as const,
      startAt: 100,
      endAt: 200,
      timeZone: 'America/Jamaica',
    }

    await browserWork.events.create(input, INVOICE_CONTEXT)

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      '/api/events?contextService=billing&contextResource=invoice&contextId=inv%2F123'
    )
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: 'POST',
      body: JSON.stringify(input),
    })
    expect(String(fetchMock.mock.calls[0]?.[1]?.body)).not.toContain('inv/123')
  })

  it('puts contextual reminder identity in the query and not the create body', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(success({ object: 'reminder', id: 'reminder_1' }))
    vi.stubGlobal('fetch', fetchMock)
    const input = {
      title: 'Check documents',
      remindAt: 200,
      timeZone: 'America/Jamaica',
    }

    await browserWork.reminders.create(input, INVOICE_CONTEXT)

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      '/api/reminders?contextService=billing&contextResource=invoice&contextId=inv%2F123'
    )
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: 'POST',
      body: JSON.stringify(input),
    })
    expect(String(fetchMock.mock.calls[0]?.[1]?.body)).not.toContain('inv/123')
    expect(String(fetchMock.mock.calls[0]?.[1]?.body)).not.toContain('userId')
  })

  it('keeps personal task creation unchanged when no host context exists', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(success({ object: 'task', id: 'task_1' }))
    vi.stubGlobal('fetch', fetchMock)

    await browserWork.tasks.create({ title: 'Personal task' })

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/tasks')
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: 'POST',
      body: JSON.stringify({ title: 'Personal task' }),
    })
  })
})
