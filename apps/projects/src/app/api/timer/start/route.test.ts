import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  startTimer: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/clients/projects', () => ({
  projects: { timeEntries: { startTimer: mocks.startTimer } },
}))

const { POST } = await import('./route')

function request(body: unknown) {
  return new Request('http://localhost/api/timer/start', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const STARTED = {
  object: 'projects.time-entry',
  id: 'tme_1',
  projectId: 'prj_1',
  userId: 'usr_1',
  startedAt: 1788400000,
  endedAt: null,
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAccess.mockResolvedValue({
    response: null,
    orgId: 'org_1',
    userId: 'usr_1',
  })
  mocks.startTimer.mockResolvedValue({
    data: { stopped: null, started: STARTED },
    error: null,
  })
})

describe('POST /api/timer/start', () => {
  it('requires the projects edit permission', async () => {
    await POST(request({ projectId: 'prj_1' }))

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.edit',
    })
  })

  it('starts the timer for the session user', async () => {
    const response = await POST(request({ projectId: 'prj_1' }))

    expect(response.status).toBe(201)
    expect(mocks.startTimer).toHaveBeenCalledWith('org_1', {
      projectId: 'prj_1',
      userId: 'usr_1',
    })
  })

  it('returns the start result, including the timer it replaced', async () => {
    const response = await POST(request({ projectId: 'prj_1' }))

    expect(await response.json()).toEqual({
      data: { stopped: null, started: STARTED },
      error: null,
    })
  })

  it('rejects a payload that names its own user', async () => {
    const response = await POST(
      request({ projectId: 'prj_1', userId: 'usr_attacker' })
    )

    expect(response.status).toBe(422)
    expect(mocks.startTimer).not.toHaveBeenCalled()
  })

  it('rejects a payload without a project', async () => {
    const response = await POST(request({ projectId: '  ' }))

    expect(response.status).toBe(422)
    expect(mocks.startTimer).not.toHaveBeenCalled()
  })

  it('maps an unknown project to 404', async () => {
    mocks.startTimer.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/project-not-found',
        message: 'That project does not exist.',
      },
    })

    const response = await POST(request({ projectId: 'prj_missing' }))

    expect(response.status).toBe(404)
  })

  it('answers the authorization failure without touching the service', async () => {
    mocks.requireAccess.mockResolvedValue({
      response: new Response(null, { status: 403 }),
    })

    const response = await POST(request({ projectId: 'prj_1' }))

    expect(response.status).toBe(403)
    expect(mocks.startTimer).not.toHaveBeenCalled()
  })
})
