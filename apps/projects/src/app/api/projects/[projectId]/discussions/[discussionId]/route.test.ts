import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/clients/projects', () => ({
  projects: {
    discussions: { update: mocks.update, delete: mocks.remove },
  },
}))

const { PATCH, DELETE } = await import('./route')

function patchRequest(body: unknown) {
  return new Request('http://localhost/api/projects/prj_1/discussions/dis_1', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function deleteRequest() {
  return new Request(
    'http://localhost/api/projects/prj_1/discussions/dis_1',
    { method: 'DELETE' }
  )
}

const context = {
  params: Promise.resolve({ projectId: 'prj_1', discussionId: 'dis_1' }),
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAccess.mockResolvedValue({
    response: null,
    orgId: 'org_1',
    userId: 'usr_1',
  })
  mocks.update.mockResolvedValue({
    data: { object: 'projects.discussion', id: 'dis_1' },
    error: null,
  })
  mocks.remove.mockResolvedValue({
    data: { object: 'projects.discussion', id: 'dis_1', deleted: true },
    error: null,
  })
})

describe('PATCH /api/projects/[projectId]/discussions/[discussionId]', () => {
  it('requires the projects edit permission for pin and lock', async () => {
    await PATCH(patchRequest({ pinned: true }), context)

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.edit',
    })
  })

  it('rejects empty updates', async () => {
    const response = await PATCH(patchRequest({}), context)

    expect(response.status).toBe(422)
    expect(mocks.update).not.toHaveBeenCalled()
  })
})

describe('DELETE /api/projects/[projectId]/discussions/[discussionId]', () => {
  it('deletes through the internal client', async () => {
    const response = await DELETE(deleteRequest(), context)

    expect(response.status).toBe(200)
    expect(mocks.remove).toHaveBeenCalledWith('org_1', 'prj_1', 'dis_1')
  })

  it('maps a missing discussion to 404', async () => {
    mocks.remove.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/discussion-not-found',
        message: 'Not found.',
      },
    })

    const response = await DELETE(deleteRequest(), context)

    expect(response.status).toBe(404)
  })
})
