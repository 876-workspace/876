import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  restore: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/services/projects', () => ({
  projects: { taskLists: { restore: mocks.restore } },
}))

const { POST } = await import('./route')

function context(taskListId = 'tl_1') {
  return { params: Promise.resolve({ taskListId }) }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAccess.mockResolvedValue({
    response: null,
    orgId: 'org_1',
    userId: 'usr_1',
  })
  mocks.restore.mockResolvedValue({
    data: { object: 'task-list', id: 'tl_1', archivedAt: null },
    error: null,
  })
})

describe('POST /api/task-lists/[taskListId]/restore', () => {
  it('restores the decoded task list and returns it', async () => {
    const response = await POST(
      new Request('http://localhost', { method: 'POST' }),
      context('tl_9')
    )

    expect(mocks.restore).toHaveBeenCalledWith('org_1', 'tl_9')
    expect(await response.json()).toEqual({
      data: { object: 'task-list', id: 'tl_1', archivedAt: null },
      error: null,
    })
  })

  it('requires the projects edit permission', async () => {
    await POST(new Request('http://localhost', { method: 'POST' }), context())

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.edit',
    })
  })

  it('returns authorization failures without touching the service', async () => {
    mocks.requireAccess.mockResolvedValue({
      response: new Response(null, { status: 403 }),
    })

    const response = await POST(
      new Request('http://localhost', { method: 'POST' }),
      context()
    )

    expect(response.status).toBe(403)
    expect(mocks.restore).not.toHaveBeenCalled()
  })
})
