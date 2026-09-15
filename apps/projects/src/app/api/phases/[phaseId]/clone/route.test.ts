import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  clone: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/services/projects', () => ({
  projects: { milestones: { clone: mocks.clone } },
}))

const { POST } = await import('./route')

function request(body: unknown) {
  return new Request('http://localhost/api/phases/ms_1/clone', {
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
  mocks.clone.mockResolvedValue({
    data: { object: 'projects.milestone', id: 'ms_2' },
    error: null,
  })
})

describe('POST /api/phases/:phaseId/clone', () => {
  it('requires projects.create and injects the authenticated actor', async () => {
    const response = await POST(
      request({ key: 'launch-copy', name: 'Launch copy' }),
      { params: Promise.resolve({ phaseId: 'ms_1' }) }
    )

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.create',
    })
    expect(mocks.clone).toHaveBeenCalledWith('org_1', 'ms_1', {
      key: 'launch-copy',
      name: 'Launch copy',
      actorUserId: 'usr_1',
    })
    expect(response.status).toBe(201)
  })

  it('rejects browser-supplied actor identity', async () => {
    const response = await POST(
      request({
        key: 'launch-copy',
        name: 'Launch copy',
        actorUserId: 'usr_attacker',
      }),
      { params: Promise.resolve({ phaseId: 'ms_1' }) }
    )

    expect(response.status).toBe(422)
    expect(mocks.clone).not.toHaveBeenCalled()
  })
})
