import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  create: vi.fn(),
  retrieve: vi.fn(),
  assignIssues: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/clients/projects', () => ({
  projects: {
    issues: { create: mocks.create, retrieve: mocks.retrieve },
    cycles: { assignIssues: mocks.assignIssues },
  },
}))

const { POST } = await import('./route')

function request(body: unknown) {
  return new NextRequest('http://localhost/api/issues', {
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
    data: { object: 'projects.issue', id: 'iss_1', identifier: 'CONSOLE-1' },
    error: null,
  })
  mocks.retrieve.mockResolvedValue({
    data: {
      object: 'projects.issue',
      id: 'iss_1',
      identifier: 'CONSOLE-1',
      cycleId: 'cyc_1',
    },
    error: null,
  })
  mocks.assignIssues.mockResolvedValue({
    data: { object: 'cycle', id: 'cyc_1' },
    error: null,
  })
})

describe('POST /api/issues', () => {
  it('requires the issue create permission', async () => {
    await POST(request({ title: 'Wire the API' }))

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'issues',
      permission: 'issues.create',
    })
  })

  it('rejects browser-supplied creator identity', async () => {
    const response = await POST(
      request({
        title: 'Wire the API',
        projectId: 'prj_1',
        taskListId: 'tl_1',
        creatorUserId: 'usr_attacker',
      })
    )

    expect(response.status).toBe(422)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('creates through the owning client with the task list attached', async () => {
    const response = await POST(
      request({ title: 'Wire the API', taskListId: 'tl_1' })
    )

    expect(mocks.create).toHaveBeenCalledWith('org_1', {
      title: 'Wire the API',
      taskListId: 'tl_1',
      creatorUserId: 'usr_1',
    })
    expect(response.status).toBe(201)
  })

  it('passes the selected cycle straight to the owning create', async () => {
    const response = await POST(
      request({ title: 'Wire the API', cycleId: 'cyc_1' })
    )

    expect(mocks.create).toHaveBeenCalledWith('org_1', {
      title: 'Wire the API',
      cycleId: 'cyc_1',
      creatorUserId: 'usr_1',
    })
    expect(mocks.assignIssues).not.toHaveBeenCalled()
    expect(mocks.retrieve).not.toHaveBeenCalled()
    expect(response.status).toBe(201)
  })

  it('surfaces a cycle failure from the owning create', async () => {
    mocks.create.mockResolvedValue({
      data: null,
      error: { code: 'projects/cycle-not-found', message: 'Missing cycle.' },
    })

    const response = await POST(
      request({ title: 'Wire the API', cycleId: 'cyc_missing' })
    )

    expect(response.status).toBe(400)
    expect(mocks.assignIssues).not.toHaveBeenCalled()
    expect(mocks.retrieve).not.toHaveBeenCalled()
  })

  it('requires a title', async () => {
    const response = await POST(request({ title: '   ' }))

    expect(response.status).toBe(422)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('returns authorization failures without touching the service', async () => {
    mocks.requireAccess.mockResolvedValue({
      response: new Response(null, { status: 403 }),
    })

    const response = await POST(request({ title: 'Wire the API' }))

    expect(response.status).toBe(403)
    expect(mocks.create).not.toHaveBeenCalled()
  })
})
