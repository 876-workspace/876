import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  recall: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/clients/projects', () => ({
  projects: { timesheets: { recall: mocks.recall } },
}))

const { POST } = await import('./route')

const context = { params: Promise.resolve({ timesheetId: 'tsh_1' }) }

function request(body: unknown) {
  return new Request('http://localhost/api/timesheets/tsh_1/recall', {
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
  mocks.recall.mockResolvedValue({
    data: { object: 'projects.timesheet', id: 'tsh_1', status: 'draft' },
    error: null,
  })
})

describe('POST /api/timesheets/[timesheetId]/recall', () => {
  it('requires the projects edit permission', async () => {
    await POST(request({}), context)

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.edit',
    })
  })

  it('recalls as the session user', async () => {
    const response = await POST(request({}), context)

    expect(response.status).toBe(200)
    expect(mocks.recall).toHaveBeenCalledWith('org_1', 'tsh_1', 'usr_1')
  })

  it('returns the recalled sheet in the data envelope', async () => {
    const response = await POST(request({}), context)

    expect(await response.json()).toEqual({
      data: { object: 'projects.timesheet', id: 'tsh_1', status: 'draft' },
      error: null,
    })
  })

  it('rejects a payload that tries to name its own user', async () => {
    const response = await POST(request({ userId: 'usr_attacker' }), context)

    expect(response.status).toBe(422)
    expect(mocks.recall).not.toHaveBeenCalled()
  })

  it('maps a sheet that is not the caller’s to 403', async () => {
    mocks.recall.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/timesheet-forbidden',
        message: 'That timesheet belongs to someone else.',
      },
    })

    const response = await POST(request({}), context)

    expect(response.status).toBe(403)
  })

  it('maps a sheet that was never submitted to 409', async () => {
    mocks.recall.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/timesheet-transition-invalid',
        message: 'That timesheet cannot be recalled.',
      },
    })

    const response = await POST(request({}), context)

    expect(response.status).toBe(409)
  })

  it('answers the authorization failure without touching the service', async () => {
    mocks.requireAccess.mockResolvedValue({
      response: new Response(null, { status: 401 }),
    })

    const response = await POST(request({}), context)

    expect(response.status).toBe(401)
    expect(mocks.recall).not.toHaveBeenCalled()
  })
})
