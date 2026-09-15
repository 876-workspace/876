import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/services/projects', () => ({
  projects: {
    taskLists: { update: mocks.update, delete: mocks.remove },
  },
}))

const { PATCH, DELETE } = await import('./route')

function context(taskListId = 'tl_1') {
  return { params: Promise.resolve({ taskListId }) }
}

function patchRequest(body: unknown) {
  return new Request('http://localhost/api/task-lists/tl_1', {
    method: 'PATCH',
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
  mocks.update.mockResolvedValue({
    data: { object: 'task-list', id: 'tl_1' },
    error: null,
  })
  mocks.remove.mockResolvedValue({
    data: { object: 'task-list', id: 'tl_1', deleted: true },
    error: null,
  })
})

describe('PATCH /api/task-lists/[taskListId]', () => {
  it('requires the projects edit permission', async () => {
    await PATCH(patchRequest({ name: 'Renamed' }), context())

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.edit',
    })
  })

  it('updates the decoded task list with the authenticated actor', async () => {
    const response = await PATCH(
      patchRequest({ name: 'Renamed', targetDate: 1700000000 }),
      context('tl%2F1')
    )

    expect(response.status).toBe(200)
    expect(mocks.update).toHaveBeenCalledWith('org_1', 'tl/1', {
      name: 'Renamed',
      targetDate: 1700000000,
      actorUserId: 'usr_1',
    })
  })

  it('rejects an empty update body', async () => {
    const response = await PATCH(patchRequest({}), context())

    expect(response.status).toBe(422)
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('rejects browser-supplied actor fields', async () => {
    const response = await PATCH(
      patchRequest({ name: 'Renamed', actorUserId: 'usr_attacker' }),
      context()
    )

    expect(response.status).toBe(422)
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('maps a missing task list to 404', async () => {
    mocks.update.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/task-list-not-found',
        message: 'That task list does not exist.',
      },
    })

    const response = await PATCH(patchRequest({ name: 'Renamed' }), context())

    expect(response.status).toBe(404)
  })
})

describe('DELETE /api/task-lists/[taskListId]', () => {
  it('deletes the decoded task list', async () => {
    const response = await DELETE(new Request('http://localhost'), context('tl_9'))

    expect(response.status).toBe(200)
    expect(mocks.remove).toHaveBeenCalledWith('org_1', 'tl_9')
  })

  it('returns authorization failures without touching the service', async () => {
    mocks.requireAccess.mockResolvedValue({
      response: new Response(null, { status: 403 }),
    })

    const response = await DELETE(new Request('http://localhost'), context())

    expect(response.status).toBe(403)
    expect(mocks.remove).not.toHaveBeenCalled()
  })
})
