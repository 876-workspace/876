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

const TASK = {
  object: 'task' as const,
  id: 'task/1',
  status: 'DONE' as const,
}

describe('browserWork', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('retrieves My Work through the host-owned bounded route', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({ data: MY_WORK, error: null }, { status: 200 })
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await browserWork.myWork.retrieve({ from: 100, to: 200 })

    expect(fetchMock).toHaveBeenCalledTimes(1)
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

  it('marks a task done through the encoded host-owned task route', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({ data: TASK, error: null }, { status: 200 })
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await browserWork.tasks.complete('task/1')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/tasks/task%2F1')
    expect(fetchMock.mock.calls[0]?.[1]).toEqual({
      method: 'PATCH',
      body: JSON.stringify({ status: 'DONE' }),
    })
    expect(result).toEqual({ data: TASK, error: null })
  })
})