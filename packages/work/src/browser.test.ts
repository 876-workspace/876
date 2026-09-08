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

describe('browserWork.myWork', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uses the host-owned product route with a bounded time range', async () => {
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
})
