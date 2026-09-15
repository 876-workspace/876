import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  moveIssues: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/services/projects', () => ({
  projects: { taskLists: { moveIssues: mocks.moveIssues } },
}))

const { POST } = await import('./route')

function context(taskListId = 'tl_1') {
  return { params: Promise.resolve({ taskListId }) }
}

function request(body: unknown) {
  return new Request('http://localhost/api/task-lists/tl_1/issues', {
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
  mocks.moveIssues.mockResolvedValue({
    data: { object: 'task-list', id: 'tl_1' },
    error: null,
  })
})

describe('POST /api/task-lists/[taskListId]/issues', () => {
  it('requires the projects edit permission', async () => {
    await POST(request({ issueIds: ['iss_1'] }), context())

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.edit',
    })
  })

  it('moves the issues onto the decoded task list as the authenticated actor', async () => {
    const response = await POST(
      request({ issueIds: ['iss_1', 'iss_2'] }),
      context('tl_7')
    )

    expect(response.status).toBe(200)
    expect(mocks.moveIssues).toHaveBeenCalledWith('org_1', 'tl_7', {
      issueIds: ['iss_1', 'iss_2'],
      actorUserId: 'usr_1',
    })
  })

  it('rejects an empty issue list', async () => {
    const response = await POST(request({ issueIds: [] }), context())

    expect(response.status).toBe(422)
    expect(mocks.moveIssues).not.toHaveBeenCalled()
  })

  it('rejects browser-supplied actor fields', async () => {
    const response = await POST(
      request({ issueIds: ['iss_1'], actorUserId: 'usr_attacker' }),
      context()
    )

    expect(response.status).toBe(422)
    expect(mocks.moveIssues).not.toHaveBeenCalled()
  })

  it('returns authorization failures without touching the service', async () => {
    mocks.requireAccess.mockResolvedValue({
      response: new Response(null, { status: 403 }),
    })

    const response = await POST(request({ issueIds: ['iss_1'] }), context())

    expect(response.status).toBe(403)
    expect(mocks.moveIssues).not.toHaveBeenCalled()
  })
})
