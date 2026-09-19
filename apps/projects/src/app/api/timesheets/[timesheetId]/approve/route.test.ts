import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  approve: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/clients/projects', () => ({
  projects: { timesheets: { approve: mocks.approve } },
}))

const { POST } = await import('./route')

const context = { params: Promise.resolve({ timesheetId: 'tsh_1' }) }

function request(body: unknown) {
  return new Request('http://localhost/api/timesheets/tsh_1/approve', {
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
  mocks.approve.mockResolvedValue({
    data: { object: 'projects.timesheet', id: 'tsh_1', status: 'approved' },
    error: null,
  })
})

describe('POST /api/timesheets/[timesheetId]/approve', () => {
  it('requires the projects edit permission', async () => {
    await POST(request({}), context)

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.edit',
    })
  })

  it('records the decision against the session user, not the payload', async () => {
    const response = await POST(request({ note: 'Looks right' }), context)

    expect(response.status).toBe(200)
    expect(mocks.approve).toHaveBeenCalledWith('org_1', 'tsh_1', {
      note: 'Looks right',
      decidedBy: 'usr_manager',
    })
  })

  it('rejects a payload that tries to name its own approver', async () => {
    const response = await POST(
      request({ decidedBy: 'usr_attacker', note: null }),
      context
    )

    expect(response.status).toBe(422)
    expect(mocks.approve).not.toHaveBeenCalled()
  })

  it('returns the decided sheet in the data envelope', async () => {
    const response = await POST(request({}), context)

    expect(await response.json()).toEqual({
      data: { object: 'projects.timesheet', id: 'tsh_1', status: 'approved' },
      error: null,
    })
  })

  it('maps a decision on the approver’s own sheet to 403', async () => {
    mocks.approve.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/timesheet-self-approval',
        message: 'A timesheet cannot be approved by its owner.',
      },
    })

    const response = await POST(request({}), context)

    expect(response.status).toBe(403)
  })

  it('maps a sheet that is not awaiting a decision to 409', async () => {
    mocks.approve.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/timesheet-transition-invalid',
        message: 'That timesheet is not awaiting a decision.',
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
    expect(mocks.approve).not.toHaveBeenCalled()
  })
})
