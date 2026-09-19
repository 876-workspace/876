import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  create: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/clients/projects', () => ({
  projects: { timesheets: { create: mocks.create } },
}))

const { POST } = await import('./route')

function request(body: unknown) {
  return new Request('http://localhost/api/timesheets', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const PERIOD = { periodStart: 1788134400, periodEnd: 1788739199 }

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAccess.mockResolvedValue({
    response: null,
    orgId: 'org_1',
    userId: 'usr_1',
  })
  mocks.create.mockResolvedValue({
    data: { object: 'projects.timesheet', id: 'tsh_1' },
    error: null,
  })
})

describe('POST /api/timesheets', () => {
  it('requires the projects edit permission', async () => {
    await POST(request(PERIOD))

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.edit',
    })
  })

  it('opens the sheet for the session user over the requested period', async () => {
    const response = await POST(request(PERIOD))

    expect(response.status).toBe(201)
    expect(mocks.create).toHaveBeenCalledWith('org_1', {
      ...PERIOD,
      userId: 'usr_1',
    })
  })

  it('returns the new sheet in the data envelope', async () => {
    const response = await POST(request(PERIOD))

    expect(await response.json()).toEqual({
      data: { object: 'projects.timesheet', id: 'tsh_1' },
      error: null,
    })
  })

  it('rejects a payload that names its own user', async () => {
    const response = await POST(request({ ...PERIOD, userId: 'usr_attacker' }))

    expect(response.status).toBe(422)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('rejects a payload without a period', async () => {
    const response = await POST(request({ periodStart: 1788134400 }))

    expect(response.status).toBe(422)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('reports a period the service refuses as unprocessable', async () => {
    mocks.create.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/invalid-request',
        message: 'periodEnd must be at or after periodStart.',
      },
    })

    const response = await POST(
      request({ periodStart: PERIOD.periodEnd, periodEnd: PERIOD.periodStart })
    )

    expect(response.status).toBe(422)
  })

  it('answers the authorization failure without touching the service', async () => {
    mocks.requireAccess.mockResolvedValue({
      response: new Response(null, { status: 401 }),
    })

    const response = await POST(request(PERIOD))

    expect(response.status).toBe(401)
    expect(mocks.create).not.toHaveBeenCalled()
  })
})
