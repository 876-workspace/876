import { afterEach, describe, expect, it, vi } from 'vitest'

import { browserWork } from './browser'

const MY_WORK = {
  object: 'my_work' as const,
  organizationId: 'org_1',
  userId: 'user_1',
  from: 100,
  to: 200,
  tasks: [],
  reminders: [],
  events: [],
  overdueTasks: [],
}

const TASK_LIST_PAGE = {
  object: 'list' as const,
  data: [],
  has_more: false,
  total_count: 0,
  url: '/v1/organizations/org_1/task-lists',
}

const TASK_PAGE = {
  object: 'list' as const,
  data: [],
  has_more: false,
  total_count: 0,
  url: '/v1/organizations/org_1/tasks',
}

const CALENDAR_PAGE = {
  object: 'list' as const,
  data: [],
  has_more: false,
  total_count: 0,
  url: '/v1/organizations/org_1/calendars',
}

const TASK = {
  object: 'task' as const,
  id: 'task/1',
  status: 'DONE' as const,
}

function success(data: unknown) {
  return Response.json({ data, error: null }, { status: 200 })
}

function expectJsonHeaders(value: unknown) {
  expect(value).toBeInstanceOf(Headers)
  if (!(value instanceof Headers)) throw new Error('Expected Headers instance.')
  expect(value.get('content-type')).toBe('application/json')
}

describe('browserWork', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('retrieves My Work through the host-owned bounded route', async () => {
    const fetchMock = vi.fn().mockResolvedValue(success(MY_WORK))
    vi.stubGlobal('fetch', fetchMock)

    const result = await browserWork.myWork.retrieve({ from: 100, to: 200 })

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/my-work?from=100&to=200')
    expect(result).toEqual({ data: MY_WORK, error: null })
  })

  it('returns client-safe host errors as values', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json(
        {
          data: null,
          error: { code: 'work/session-forbidden', message: 'Forbidden.' },
        },
        { status: 403 }
      )
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await browserWork.myWork.retrieve({ from: 100, to: 200 })

    expect(result).toEqual({
      data: null,
      error: { code: 'work/session-forbidden', message: 'Forbidden.' },
    })
  })

  it('lists task lists through the host-owned route', async () => {
    const fetchMock = vi.fn().mockResolvedValue(success(TASK_LIST_PAGE))
    vi.stubGlobal('fetch', fetchMock)

    const result = await browserWork.taskLists.list()

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/task-lists')
    expect(result).toEqual({ data: TASK_LIST_PAGE, error: null })
  })

  it('lists assigned tasks with an encoded optional list filter', async () => {
    const fetchMock = vi.fn().mockResolvedValue(success(TASK_PAGE))
    vi.stubGlobal('fetch', fetchMock)

    const result = await browserWork.tasks.list({ listId: 'list/1' })

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/tasks?listId=list%2F1')
    expect(result).toEqual({ data: TASK_PAGE, error: null })
  })

  it('encodes task list and item cursor filters together', async () => {
    const fetchMock = vi.fn().mockResolvedValue(success(TASK_PAGE))
    vi.stubGlobal('fetch', fetchMock)

    await browserWork.tasks.list({
      listId: 'list/1',
      startingAfter: 'task/25',
    })

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      '/api/tasks?listId=list%2F1&startingAfter=task%2F25'
    )
  })

  it('creates a task through the host-owned collection route', async () => {
    const fetchMock = vi.fn().mockResolvedValue(success(TASK))
    vi.stubGlobal('fetch', fetchMock)

    await browserWork.tasks.create({ title: 'Follow up', listId: 'list_1' })

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/tasks')
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: 'POST',
      body: JSON.stringify({ title: 'Follow up', listId: 'list_1' }),
    })
    expectJsonHeaders(fetchMock.mock.calls[0]?.[1]?.headers)
  })

  it('updates editable task fields through an explicit update action', async () => {
    const fetchMock = vi.fn().mockResolvedValue(success(TASK))
    vi.stubGlobal('fetch', fetchMock)

    await browserWork.tasks.update('task/1', {
      title: 'Updated',
      importance: 'HIGH',
    })

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/tasks/task%2F1')
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: 'PATCH',
      body: JSON.stringify({
        action: 'update',
        title: 'Updated',
        importance: 'HIGH',
      }),
    })
    expectJsonHeaders(fetchMock.mock.calls[0]?.[1]?.headers)
  })

  it('marks a task done through an explicit completion action', async () => {
    const fetchMock = vi.fn().mockResolvedValue(success(TASK))
    vi.stubGlobal('fetch', fetchMock)

    const result = await browserWork.tasks.complete('task/1')

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/tasks/task%2F1')
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: 'PATCH',
      body: JSON.stringify({ action: 'complete' }),
    })
    expectJsonHeaders(fetchMock.mock.calls[0]?.[1]?.headers)
    expect(result).toEqual({ data: TASK, error: null })
  })

  it('cancels a task through an explicit cancel action', async () => {
    const fetchMock = vi.fn().mockResolvedValue(success(TASK))
    vi.stubGlobal('fetch', fetchMock)

    await browserWork.tasks.cancel('task/1')

    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: 'PATCH',
      body: JSON.stringify({ action: 'cancel' }),
    })
    expectJsonHeaders(fetchMock.mock.calls[0]?.[1]?.headers)
  })

  it('lists visible calendars through the host-owned route', async () => {
    const fetchMock = vi.fn().mockResolvedValue(success(CALENDAR_PAGE))
    vi.stubGlobal('fetch', fetchMock)

    const result = await browserWork.calendars.list()

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/calendars')
    expect(result).toEqual({ data: CALENDAR_PAGE, error: null })
  })
})