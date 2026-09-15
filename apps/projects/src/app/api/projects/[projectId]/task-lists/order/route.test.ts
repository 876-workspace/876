import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  reorder: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/services/projects', () => ({
  projects: { taskLists: { reorder: mocks.reorder } },
}))

const { PUT } = await import('./route')

function context(projectId = 'prj_1') {
  return { params: Promise.resolve({ projectId }) }
}

function request(body: unknown) {
  return new Request('http://localhost/api/projects/prj_1/task-lists/order', {
    method: 'PUT',
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
  mocks.reorder.mockResolvedValue({
    data: { object: 'list', data: [] },
    error: null,
  })
})

describe('PUT /api/projects/[projectId]/task-lists/order', () => {
  it('requires the projects edit permission', async () => {
    await PUT(request({ orderedIds: ['tl_1'] }), context())

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.edit',
    })
  })

  it('reorders the project task lists as the authenticated actor', async () => {
    const response = await PUT(
      request({ orderedIds: ['tl_2', 'tl_1'] }),
      context('prj_9')
    )

    expect(response.status).toBe(200)
    expect(mocks.reorder).toHaveBeenCalledWith('org_1', 'prj_9', {
      orderedIds: ['tl_2', 'tl_1'],
      actorUserId: 'usr_1',
    })
  })

  it('rejects an empty order', async () => {
    const response = await PUT(request({ orderedIds: [] }), context())

    expect(response.status).toBe(422)
    expect(mocks.reorder).not.toHaveBeenCalled()
  })

  it('rejects browser-supplied actor fields', async () => {
    const response = await PUT(
      request({ orderedIds: ['tl_1'], actorUserId: 'usr_attacker' }),
      context()
    )

    expect(response.status).toBe(422)
    expect(mocks.reorder).not.toHaveBeenCalled()
  })
})
