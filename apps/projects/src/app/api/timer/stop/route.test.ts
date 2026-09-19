import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  stopTimer: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/clients/projects', () => ({
  projects: { timeEntries: { stopTimer: mocks.stopTimer } },
}))

const { POST } = await import('./route')

function request(body: unknown) {
  return new Request('http://localhost/api/timer/stop', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAccess.mockResolvedValue({
    response: null,
    orgId: 'org_1',
    userId: 'usr_1',
  })
  mocks.stopTimer.mockResolvedValue({
    data: {
      object: 'projects.time-entry',
      id: 'tme_1',
      durationMinutes: 42,
    },
    error: null,
  })
})

describe('POST /api/timer/stop', () => {
  it('requires the projects edit permission', async () => {
    await POST(request({}))

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.edit',
    })
  })

  it('stops the session user’s timer and lets the service date it', async () => {
    const response = await POST(request({}))

    expect(response.status).toBe(200)
    expect(mocks.stopTimer).toHaveBeenCalledWith('org_1', { userId: 'usr_1' })
  })

  it('returns the closed entry, whose duration the service computed', async () => {
    const response = await POST(request({}))

    expect(await response.json()).toEqual({
      data: { object: 'projects.time-entry', id: 'tme_1', durationMinutes: 42 },
      error: null,
    })
  })

  it('rejects a payload that tries to set the stop instant or the user', async () => {
    const response = await POST(
      request({ userId: 'usr_1', endedAt: 1788400000 })
    )

    expect(response.status).toBe(422)
    expect(mocks.stopTimer).not.toHaveBeenCalled()
  })

  it('maps a missing running timer to 404', async () => {
    mocks.stopTimer.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/timer-not-found',
        message: 'No timer is running.',
      },
    })

    const response = await POST(request({}))

    expect(response.status).toBe(404)
  })

  it('answers the authorization failure without touching the service', async () => {
    mocks.requireAccess.mockResolvedValue({
      response: new Response(null, { status: 401 }),
    })

    const response = await POST(request({}))

    expect(response.status).toBe(401)
    expect(mocks.stopTimer).not.toHaveBeenCalled()
  })
})
