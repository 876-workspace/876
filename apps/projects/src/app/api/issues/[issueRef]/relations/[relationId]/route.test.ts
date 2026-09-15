import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  remove: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/services/projects', () => ({
  projects: { issueRelations: { delete: mocks.remove } },
}))

const { DELETE } = await import('./route')

function context(issueRef = 'CONSOLE-2', relationId = 'isr_1') {
  return { params: Promise.resolve({ issueRef, relationId }) }
}

function request() {
  return new Request('http://localhost/api/issues/CONSOLE-2/relations/isr_1', {
    method: 'DELETE',
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAccess.mockResolvedValue({
    response: null,
    orgId: 'org_1',
    userId: 'usr_1',
  })
  mocks.remove.mockResolvedValue({
    data: { object: 'issue-relation', id: 'isr_1', deleted: true },
    error: null,
  })
})

describe('DELETE /api/issues/[issueRef]/relations/[relationId]', () => {
  it('requires the issues edit permission', async () => {
    await DELETE(request(), context())

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'issues',
      permission: 'issues.edit',
    })
  })

  it('removes the relationship from the decoded work item', async () => {
    const response = await DELETE(request(), context('CONSOLE%2F2', 'isr%2F1'))

    expect(response.status).toBe(200)
    expect(mocks.remove).toHaveBeenCalledWith('org_1', 'CONSOLE/2', 'isr/1')
  })

  it('returns the removal tombstone in the data envelope', async () => {
    const response = await DELETE(request(), context())

    expect(await response.json()).toEqual({
      data: { object: 'issue-relation', id: 'isr_1', deleted: true },
      error: null,
    })
  })

  it('returns authorization failures without touching the service', async () => {
    mocks.requireAccess.mockResolvedValue({
      response: new Response(null, { status: 403 }),
    })

    const response = await DELETE(request(), context())

    expect(response.status).toBe(403)
    expect(mocks.remove).not.toHaveBeenCalled()
  })

  it('maps a relationship that is not on this work item to 404', async () => {
    mocks.remove.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/issue-relation-not-found',
        message: 'That relationship does not exist.',
      },
    })

    const response = await DELETE(request(), context())

    expect(response.status).toBe(404)
  })
})
