import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  archive: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/clients/projects', () => ({
  projects: { taskLists: { archive: mocks.archive } },
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
  mocks.archive.mockResolvedValue({
    data: { object: 'task-list', id: 'tl_1', archivedAt: 1700000000 },
    error: null,
  })
})

describe('POST /api/task-lists/[taskListId]/archive', () => {
  it('requires the projects edit permission', async () => {
    await POST(new Request('http://localhost', { method: 'POST' }), context())

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.edit',
    })
  })

  it('archives the decoded task list and returns it', async () => {
    const response = await POST(
      new Request('http://localhost', { method: 'POST' }),
      context('tl%2F1')
    )

    expect(mocks.archive).toHaveBeenCalledWith('org_1', 'tl/1')
    expect(await response.json()).toEqual({
      data: { object: 'task-list', id: 'tl_1', archivedAt: 1700000000 },
      error: null,
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
    expect(mocks.archive).not.toHaveBeenCalled()
  })

  it('maps a missing task list to 404', async () => {
    mocks.archive.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/task-list-not-found',
        message: 'That task list does not exist.',
      },
    })

    const response = await POST(
      new Request('http://localhost', { method: 'POST' }),
      context()
    )

    expect(response.status).toBe(404)
  })
})
