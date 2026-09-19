import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  create: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/clients/projects', () => ({
  projects: { milestones: { create: mocks.create } },
}))

const { POST } = await import('./route')

function request(body: unknown) {
  return new Request('http://localhost/api/phases', {
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
  mocks.create.mockResolvedValue({
    data: { object: 'projects.milestone', id: 'ms_1' },
    error: null,
  })
})

describe('POST /api/phases', () => {
  it('requires the projects create permission', async () => {
    await POST(
      request({ projectId: 'prj_1', key: 'launch', name: 'Launch' })
    )

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.create',
    })
  })

  it('injects the authenticated actor and ignores browser actor fields', async () => {
    const response = await POST(
      request({
        projectId: 'prj_1',
        key: 'launch',
        name: 'Launch',
        ownerUserId: 'usr_owner',
      })
    )

    expect(response.status).toBe(201)
    expect(mocks.create).toHaveBeenCalledWith('org_1', {
      projectId: 'prj_1',
      key: 'launch',
      name: 'Launch',
      ownerUserId: 'usr_owner',
      actorUserId: 'usr_1',
    })
  })

  it('rejects unknown fields so the browser cannot submit actorUserId', async () => {
    const response = await POST(
      request({
        projectId: 'prj_1',
        key: 'launch',
        name: 'Launch',
        actorUserId: 'usr_attacker',
      })
    )

    expect(response.status).toBe(422)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('returns authorization failures without touching the service', async () => {
    mocks.requireAccess.mockResolvedValue({
      response: new Response(null, { status: 403 }),
    })

    const response = await POST(
      request({ projectId: 'prj_1', key: 'launch', name: 'Launch' })
    )

    expect(response.status).toBe(403)
    expect(mocks.create).not.toHaveBeenCalled()
  })
})
