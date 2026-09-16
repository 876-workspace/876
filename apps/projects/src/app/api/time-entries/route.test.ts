import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  create: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/services/projects', () => ({
  projects: { timeEntries: { create: mocks.create } },
}))

const { POST } = await import('./route')

function request(body: unknown) {
  return new Request('http://localhost/api/time-entries', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const ENTRY = {
  projectId: 'prj_1',
  startedAt: 1788400000,
  endedAt: 1788403600,
  billable: true,
  note: 'Wrote the migration',
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAccess.mockResolvedValue({
    response: null,
    orgId: 'org_1',
    userId: 'usr_1',
  })
  mocks.create.mockResolvedValue({
    data: { object: 'projects.time-entry', id: 'tme_1' },
    error: null,
  })
})

describe('POST /api/time-entries', () => {
  it('requires the projects edit permission', async () => {
    await POST(request(ENTRY))

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.edit',
    })
  })

  it('logs the entry against the session user, not the payload', async () => {
    const response = await POST(request(ENTRY))

    expect(response.status).toBe(201)
    expect(mocks.create).toHaveBeenCalledWith('org_1', {
      ...ENTRY,
      userId: 'usr_1',
      createdBy: 'usr_1',
    })
  })

  it('rejects a payload that tries to name its own user', async () => {
    const response = await POST(request({ ...ENTRY, userId: 'usr_attacker' }))

    expect(response.status).toBe(422)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('reports a range the service refuses as unprocessable', async () => {
    mocks.create.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/invalid-request',
        message: 'endedAt must be at or after startedAt.',
      },
    })

    const response = await POST(
      request({ ...ENTRY, startedAt: 1788403600, endedAt: 1788400000 })
    )

    expect(response.status).toBe(422)
    expect((await response.json()).error).toMatchObject({
      message: 'endedAt must be at or after startedAt.',
    })
  })

  it('rejects a payload without a project', async () => {
    const response = await POST(request({ ...ENTRY, projectId: '' }))

    expect(response.status).toBe(422)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('returns the logged entry in the data envelope', async () => {
    const response = await POST(request(ENTRY))

    expect(await response.json()).toEqual({
      data: { object: 'projects.time-entry', id: 'tme_1' },
      error: null,
    })
  })

  it('maps a missing project to 404', async () => {
    mocks.create.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/project-not-found',
        message: 'That project does not exist.',
      },
    })

    const response = await POST(request(ENTRY))

    expect(response.status).toBe(404)
  })

  it('answers the authorization failure without touching the service', async () => {
    mocks.requireAccess.mockResolvedValue({
      response: new Response(null, { status: 401 }),
    })

    const response = await POST(request(ENTRY))

    expect(response.status).toBe(401)
    expect(mocks.create).not.toHaveBeenCalled()
  })
})
