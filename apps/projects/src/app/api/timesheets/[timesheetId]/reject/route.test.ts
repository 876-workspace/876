import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  reject: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/services/projects', () => ({
  projects: { timesheets: { reject: mocks.reject } },
}))

const { POST } = await import('./route')

const context = { params: Promise.resolve({ timesheetId: 'tsh_1' }) }

function request(body: unknown) {
  return new Request('http://localhost/api/timesheets/tsh_1/reject', {
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
    userId: 'usr_manager',
  })
  mocks.reject.mockResolvedValue({
    data: { object: 'projects.timesheet', id: 'tsh_1', status: 'rejected' },
    error: null,
  })
})

describe('POST /api/timesheets/[timesheetId]/reject', () => {
  it('requires the projects edit permission', async () => {
    await POST(request({ note: 'Wrong project' }), context)

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.edit',
    })
  })

  it('records the rejection against the session user', async () => {
    const response = await POST(request({ note: 'Wrong project' }), context)

    expect(response.status).toBe(200)
    expect(mocks.reject).toHaveBeenCalledWith('org_1', 'tsh_1', {
      note: 'Wrong project',
      decidedBy: 'usr_manager',
    })
  })

  it('rejects a rejection without a reason', async () => {
    const response = await POST(request({ note: '   ' }), context)

    expect(response.status).toBe(422)
    expect(mocks.reject).not.toHaveBeenCalled()
  })

  it('rejects a payload that tries to name its own approver', async () => {
    const response = await POST(
      request({ note: 'Wrong project', decidedBy: 'usr_attacker' }),
      context
    )

    expect(response.status).toBe(422)
    expect(mocks.reject).not.toHaveBeenCalled()
  })

  it('returns the rejected sheet in the data envelope', async () => {
    const response = await POST(request({ note: 'Wrong project' }), context)

    expect(await response.json()).toEqual({
      data: { object: 'projects.timesheet', id: 'tsh_1', status: 'rejected' },
      error: null,
    })
  })

  it('maps a rejection of the approver’s own sheet to 403', async () => {
    mocks.reject.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/timesheet-self-approval',
        message: 'A timesheet cannot be rejected by its owner.',
      },
    })

    const response = await POST(request({ note: 'Mine' }), context)

    expect(response.status).toBe(403)
  })

  it('answers the authorization failure without touching the service', async () => {
    mocks.requireAccess.mockResolvedValue({
      response: new Response(null, { status: 401 }),
    })

    const response = await POST(request({ note: 'Wrong project' }), context)

    expect(response.status).toBe(401)
    expect(mocks.reject).not.toHaveBeenCalled()
  })
})
