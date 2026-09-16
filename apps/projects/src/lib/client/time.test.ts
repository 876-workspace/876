import { beforeEach, describe, expect, it, vi } from 'vitest'

import { timeClient } from './time'

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

const fetchMock = vi.fn<typeof globalThis.fetch>()

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('fetch', fetchMock)
})

function lastCall(): { url: unknown; init: RequestInit | undefined } {
  const call = fetchMock.mock.calls[0]
  if (!call) throw new Error('expected fetch to be called')

  return { url: call[0], init: call[1] }
}

function body(): Record<string, unknown> {
  const { init } = lastCall()

  return JSON.parse(init?.body as string) as Record<string, unknown>
}

describe('timeClient.createEntry', () => {
  it('posts the entry without naming a user', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ data: { object: 'projects.time-entry' }, error: null }, 201)
    )

    await timeClient.createEntry({
      projectId: 'prj_1',
      startedAt: 1704273300,
      endedAt: 1704278700,
    })

    const { url, init } = lastCall()
    expect(url).toBe('/api/time-entries')
    expect(init?.method).toBe('POST')
    expect(body()).toEqual({
      projectId: 'prj_1',
      startedAt: 1704273300,
      endedAt: 1704278700,
    })
  })

  it('passes a refusal through without HTTP metadata', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          data: null,
          error: { code: 'validation/invalid-request', message: 'Enter a project.' },
        },
        422
      )
    )

    const result = await timeClient.createEntry({
      projectId: '',
      startedAt: 0,
      endedAt: 0,
    })

    expect(result.data).toBeNull()
    expect(result.error).toMatchObject({
      code: 'validation/invalid-request',
      message: 'Enter a project.',
    })
  })
})

describe('timeClient.updateEntry and deleteEntry', () => {
  it('patches the entry it was given', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ data: { object: 'projects.time-entry' }, error: null })
    )

    await timeClient.updateEntry('tme_1', {
      startedAt: 1704273300,
      endedAt: 1704278700,
      billable: true,
      note: null,
    })

    const { url, init } = lastCall()
    expect(url).toBe('/api/time-entries/tme_1')
    expect(init?.method).toBe('PATCH')
    expect(body()).toEqual({
      startedAt: 1704273300,
      endedAt: 1704278700,
      billable: true,
      note: null,
    })
  })

  it('deletes without a user in the query the browser controls', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ data: { object: 'projects.time-entry' }, error: null })
    )

    await timeClient.deleteEntry('tme/1')

    const { url, init } = lastCall()
    expect(url).toBe('/api/time-entries/tme%2F1')
    expect(init?.method).toBe('DELETE')
    expect(String(url)).not.toContain('userId')
  })
})

describe('timeClient timer', () => {
  it('starts a timer for one project', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ data: { stopped: null }, error: null }, 201)
    )

    await timeClient.startTimer({ projectId: 'prj_1' })

    const { url, init } = lastCall()
    expect(url).toBe('/api/timer/start')
    expect(init?.method).toBe('POST')
    expect(body()).toEqual({ projectId: 'prj_1' })
  })

  it('stops the timer with an empty payload', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ data: { object: 'projects.time-entry' }, error: null })
    )

    await timeClient.stopTimer()

    const { url, init } = lastCall()
    expect(url).toBe('/api/timer/stop')
    expect(init?.method).toBe('POST')
    expect(body()).toEqual({})
  })
})

describe('timeClient timesheets', () => {
  it('opens a sheet over the period', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ data: { object: 'projects.timesheet' }, error: null }, 201)
    )

    await timeClient.createTimesheet({
      periodStart: 1704067200,
      periodEnd: 1704671999,
    })

    expect(lastCall().url).toBe('/api/timesheets')
    expect(body()).toEqual({
      periodStart: 1704067200,
      periodEnd: 1704671999,
    })
  })

  it('submits and recalls through their own paths with an empty payload', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ data: { object: 'projects.timesheet' }, error: null })
    )

    await timeClient.submitTimesheet('tsh_1')
    expect(lastCall().url).toBe('/api/timesheets/tsh_1/submit')
    expect(body()).toEqual({})

    fetchMock.mockClear()
    await timeClient.recallTimesheet('tsh_1')
    expect(lastCall().url).toBe('/api/timesheets/tsh_1/recall')
    expect(body()).toEqual({})
  })

  it('sends the decision note without naming the approver', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ data: { object: 'projects.timesheet' }, error: null })
    )

    await timeClient.approveTimesheet('tsh_1', 'Looks right')
    expect(lastCall().url).toBe('/api/timesheets/tsh_1/approve')
    expect(body()).toEqual({ note: 'Looks right' })

    fetchMock.mockClear()
    await timeClient.rejectTimesheet('tsh_1', 'Wrong project charged')
    expect(lastCall().url).toBe('/api/timesheets/tsh_1/reject')
    expect(body()).toEqual({ note: 'Wrong project charged' })
  })
})
