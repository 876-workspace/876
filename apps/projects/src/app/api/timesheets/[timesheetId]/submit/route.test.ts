import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  submit: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/clients/projects', () => ({
  projects: { timesheets: { submit: mocks.submit } },
}))

const { POST } = await import('./route')

const context = { params: Promise.resolve({ timesheetId: 'tsh_1' }) }

function request(body: unknown) {
  return new Request('http://localhost/api/timesheets/tsh_1/submit', {
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
  mocks.submit.mockResolvedValue({
    data: { object: 'projects.timesheet', id: 'tsh_1', status: 'submitted' },
    error: null,
  })
})

describe('POST /api/timesheets/[timesheetId]/submit', () => {
  it('requires the projects edit permission', async () => {
    await POST(request({}), context)

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.edit',
    })
  })

  it('submits as the session user', async () => {
    const response = await POST(request({}), context)

    expect(response.status).toBe(200)
    expect(mocks.submit).toHaveBeenCalledWith('org_1', 'tsh_1', 'usr_1')
  })

  it('returns the submitted sheet in the data envelope', async () => {
    const response = await POST(request({}), context)

    expect(await response.json()).toEqual({
      data: { object: 'projects.timesheet', id: 'tsh_1', status: 'submitted' },
      error: null,
    })
  })

  it('rejects a payload that tries to name its own user', async () => {
    const response = await POST(request({ userId: 'usr_attacker' }), context)

    expect(response.status).toBe(422)
    expect(mocks.submit).not.toHaveBeenCalled()
  })

  it('maps a sheet that is not the caller’s to 403', async () => {
    mocks.submit.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/timesheet-forbidden',
        message: 'That timesheet belongs to someone else.',
      },
    })

    const response = await POST(request({}), context)

    expect(response.status).toBe(403)
  })

  it('maps a sheet that is no longer a draft to 409', async () => {
    mocks.submit.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/timesheet-transition-invalid',
        message: 'That timesheet cannot be submitted.',
      },
    })

    const response = await POST(request({}), context)

    expect(response.status).toBe(409)
  })

  it('answers the authorization failure without touching the service', async () => {
    mocks.requireAccess.mockResolvedValue({
      response: new Response(null, { status: 403 }),
    })

    const response = await POST(request({}), context)

    expect(response.status).toBe(403)
    expect(mocks.submit).not.toHaveBeenCalled()
  })
})
