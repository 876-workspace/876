import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  assign: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/services/projects', () => ({
  projects: { cycles: { assignIssues: mocks.assign } },
}))

const { POST } = await import('./route')

function request(body: unknown) {
  return new Request('http://localhost/api/cycles/cyc_1/issues', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function context() {
  return { params: Promise.resolve({ cycleId: 'cyc_1' }) }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAccess.mockResolvedValue({
    response: null,
    orgId: 'org_1',
    userId: 'usr_1',
  })
  mocks.assign.mockResolvedValue({
    data: { object: 'cycle', id: 'cyc_1' },
    error: null,
  })
})

describe('POST /api/cycles/[cycleId]/issues', () => {
  it('requires the projects edit permission', async () => {
    await POST(request({ issueIds: ['iss_1'] }), context())

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.edit',
    })
  })

  it('binds the authenticated actor', async () => {
    const response = await POST(request({ issueIds: ['iss_1'] }), context())

    expect(response.status).toBe(200)
    expect(mocks.assign).toHaveBeenCalledWith('org_1', 'cyc_1', {
      issueIds: ['iss_1'],
      actorUserId: 'usr_1',
    })
  })

  it('rejects empty selections', async () => {
    const response = await POST(request({ issueIds: [] }), context())

    expect(response.status).toBe(422)
    expect(mocks.assign).not.toHaveBeenCalled()
  })
})
