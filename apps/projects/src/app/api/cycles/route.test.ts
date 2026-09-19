import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  create: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/clients/projects', () => ({
  projects: { cycles: { create: mocks.create } },
}))

const { POST } = await import('./route')

function request(body: unknown) {
  return new Request('http://localhost/api/cycles', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function validBody() {
  return {
    projectId: 'prj_1',
    name: 'Sprint 12',
    description: 'Ship the cycle.',
    goal: 'Ship it.',
    startsAt: 1757894400,
    endsAt: 1758499200,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAccess.mockResolvedValue({
    response: null,
    orgId: 'org_1',
    userId: 'usr_1',
  })
  mocks.create.mockResolvedValue({
    data: { object: 'cycle', id: 'cyc_1' },
    error: null,
  })
})

describe('POST /api/cycles', () => {
  it('requires the projects edit permission', async () => {
    await POST(request(validBody()))

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.edit',
    })
  })

  it('binds the authenticated actor', async () => {
    const response = await POST(request(validBody()))

    expect(response.status).toBe(201)
    expect(mocks.create).toHaveBeenCalledWith('org_1', {
      ...validBody(),
      actorUserId: 'usr_1',
    })
  })

  it('rejects an end before its start', async () => {
    const response = await POST(
      request({ ...validBody(), startsAt: 1758499200, endsAt: 1757894400 }),
    )

    expect(response.status).toBe(422)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('rejects unknown fields so the browser cannot submit actorUserId', async () => {
    const response = await POST(
      request({ ...validBody(), actorUserId: 'usr_attacker' }),
    )

    expect(response.status).toBe(422)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('returns authorization failures without touching the service', async () => {
    mocks.requireAccess.mockResolvedValue({
      response: new Response(null, { status: 403 }),
    })

    const response = await POST(request(validBody()))

    expect(response.status).toBe(403)
    expect(mocks.create).not.toHaveBeenCalled()
  })
})
