import { beforeEach, describe, expect, it, vi } from 'vitest'

import { GET } from './route'

const mocks = vi.hoisted(() => ({
  requireWorkWidgetPermission: vi.fn(),
  getWork: vi.fn(),
  retrieve: vi.fn(),
}))

vi.mock('@/lib/auth/work-widget-access', () => ({
  requireWorkWidgetPermission: mocks.requireWorkWidgetPermission,
}))
vi.mock('@/lib/services/work', () => ({ getWork: mocks.getWork }))

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

function request(query = 'from=100&to=200') {
  return new Request(`http://invoice.test/api/my-work?${query}`)
}

describe('GET /api/my-work', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.requireWorkWidgetPermission.mockResolvedValue({
      response: null,
      orgId: 'org_1',
      userId: 'user_1',
    })
    mocks.getWork.mockResolvedValue({
      myWork: { retrieve: mocks.retrieve },
    })
    mocks.retrieve.mockResolvedValue({ data: MY_WORK, error: null })
  })

  it('returns the Work widget access response before reading Work', async () => {
    mocks.requireWorkWidgetPermission.mockResolvedValue({
      response: Response.json(
        { data: null, error: { code: 'auth/no-session', message: 'Sign in.' } },
        { status: 401 }
      ),
    })

    const response = await GET(request())

    expect(response.status).toBe(401)
    expect(mocks.getWork).not.toHaveBeenCalled()
  })

  it('requires the exact My Work permission', async () => {
    await GET(request())

    expect(mocks.requireWorkWidgetPermission).toHaveBeenCalledWith(
      'my-work.view'
    )
  })

  it('rejects a missing or malformed time range', async () => {
    const response = await GET(request('from=100'))
    const payload = await response.json()

    expect(response.status).toBe(422)
    expect(payload.error.code).toBe('work/invalid-request')
    expect(mocks.getWork).not.toHaveBeenCalled()
  })

  it('rejects a range larger than the bounded widget window', async () => {
    const tooLarge = 100 + 62 * 24 * 60 * 60 + 1

    const response = await GET(request(`from=100&to=${tooLarge}`))
    const payload = await response.json()

    expect(response.status).toBe(422)
    expect(payload.error.code).toBe('work/invalid-request')
    expect(mocks.getWork).not.toHaveBeenCalled()
  })

  it('retrieves only the signed-in organization My Work range', async () => {
    const response = await GET(request('from=100&to=200'))
    const payload = await response.json()

    expect(mocks.retrieve).toHaveBeenCalledWith('org_1', { from: 100, to: 200 })
    expect(response.status).toBe(200)
    expect(payload).toEqual({ data: MY_WORK, error: null })
  })

  it('preserves registered Work authorization failures', async () => {
    mocks.retrieve.mockResolvedValue({
      data: null,
      error: {
        code: 'work/session-forbidden',
        message: 'You do not have permission to perform this Work action.',
      },
    })

    const response = await GET(request())
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload.error.code).toBe('work/session-forbidden')
  })

  it('maps unknown upstream failures to the registered invalid-response error', async () => {
    mocks.retrieve.mockResolvedValue({
      data: null,
      error: {
        code: 'unexpected/service-error',
        message: 'raw provider detail',
      },
    })

    const response = await GET(request())
    const payload = await response.json()

    expect(response.status).toBe(502)
    expect(payload.error).toEqual({
      code: 'work/invalid-response',
      message: 'Work API returned an invalid response.',
    })
  })
})
