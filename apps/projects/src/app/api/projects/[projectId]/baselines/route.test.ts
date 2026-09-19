import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  create: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/clients/projects', () => ({
  projects: { baselines: { create: mocks.create } },
}))

const { POST } = await import('./route')

const context = { params: Promise.resolve({ projectId: 'prj_1' }) }

function request(body: unknown) {
  return new Request('http://localhost/api/projects/prj_1/baselines', {
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
    data: { object: 'projects.baseline', id: 'bsl_1' },
    error: null,
  })
})

describe('POST /api/projects/[projectId]/baselines', () => {
  it('requires the projects edit permission', async () => {
    await POST(request({ name: 'Kickoff plan' }), context)

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.edit',
    })
  })

  it('captures the baseline for the project, scoped to the organization and actor', async () => {
    const response = await POST(
      request({ name: 'Kickoff plan', note: 'Signed off by the client' }),
      context
    )

    expect(response.status).toBe(201)
    expect(mocks.create).toHaveBeenCalledWith('org_1', 'prj_1', {
      name: 'Kickoff plan',
      note: 'Signed off by the client',
      capturedBy: 'usr_1',
    })
  })

  it('returns the captured baseline in the data envelope', async () => {
    const response = await POST(request({ name: 'Kickoff plan' }), context)

    expect(await response.json()).toEqual({
      data: { object: 'projects.baseline', id: 'bsl_1' },
      error: null,
    })
  })

  it('rejects an unknown field so the browser cannot set capturedBy', async () => {
    const response = await POST(
      request({ name: 'Kickoff plan', capturedBy: 'usr_attacker' }),
      context
    )

    expect(response.status).toBe(422)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('rejects an empty name', async () => {
    const response = await POST(request({ name: '   ' }), context)

    expect(response.status).toBe(422)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('returns the authorization failure without touching the service', async () => {
    mocks.requireAccess.mockResolvedValue({
      response: new Response(null, { status: 403 }),
    })

    const response = await POST(request({ name: 'Kickoff plan' }), context)

    expect(response.status).toBe(403)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('maps a missing project to 404', async () => {
    mocks.create.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/project-not-found',
        message: 'That project does not exist.',
      },
    })

    const response = await POST(request({ name: 'Kickoff plan' }), context)

    expect(response.status).toBe(404)
  })
})
