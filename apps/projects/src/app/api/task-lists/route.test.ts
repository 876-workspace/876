import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  create: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/services/projects', () => ({
  projects: { taskLists: { create: mocks.create } },
}))

const { POST } = await import('./route')

function request(body: unknown) {
  return new Request('http://localhost/api/task-lists', {
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
    data: { object: 'task-list', id: 'tl_1' },
    error: null,
  })
})

describe('POST /api/task-lists', () => {
  it('requires the projects edit permission', async () => {
    await POST(request({ projectId: 'prj_1', name: 'Groundwork' }))

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.edit',
    })
  })

  it('scopes the create to the project and injects the authenticated actor', async () => {
    const response = await POST(
      request({
        projectId: 'prj_1',
        name: 'Groundwork',
        milestoneId: 'ms_1',
        ownerUserId: 'usr_owner',
        startDate: 1700000000,
      })
    )

    expect(response.status).toBe(201)
    expect(mocks.create).toHaveBeenCalledWith('org_1', 'prj_1', {
      name: 'Groundwork',
      milestoneId: 'ms_1',
      ownerUserId: 'usr_owner',
      startDate: 1700000000,
      actorUserId: 'usr_1',
    })
  })

  it('returns the created task list in the data envelope', async () => {
    const response = await POST(request({ projectId: 'prj_1', name: 'Groundwork' }))

    expect(await response.json()).toEqual({
      data: { object: 'task-list', id: 'tl_1' },
      error: null,
    })
  })

  it('rejects unknown fields so the browser cannot submit actorUserId', async () => {
    const response = await POST(
      request({
        projectId: 'prj_1',
        name: 'Groundwork',
        actorUserId: 'usr_attacker',
      })
    )

    expect(response.status).toBe(422)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('rejects an empty name', async () => {
    const response = await POST(request({ projectId: 'prj_1', name: '  ' }))

    expect(response.status).toBe(422)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('returns authorization failures without touching the service', async () => {
    mocks.requireAccess.mockResolvedValue({
      response: new Response(null, { status: 403 }),
    })

    const response = await POST(request({ projectId: 'prj_1', name: 'Groundwork' }))

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

    const response = await POST(request({ projectId: 'prj_missing', name: 'Groundwork' }))

    expect(response.status).toBe(404)
  })
})
