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
    issueDependencies: { update: mocks.update, delete: mocks.remove },
  },
}))

const { PATCH, DELETE } = await import('./route')

function context(issueRef = 'CONSOLE-2', dependencyId = 'isd_1') {
  return { params: Promise.resolve({ issueRef, dependencyId }) }
}

function patchRequest(body: unknown) {
  return new Request(
    'http://localhost/api/issues/CONSOLE-2/dependencies/isd_1',
    {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }
  )
}

const dependency = {
  object: 'issue-dependency',
  id: 'isd_1',
  tenantId: 'tnt_1',
  predecessorIssueId: 'iss_1',
  successorIssueId: 'iss_2',
  type: 'finish-to-start',
  lagMinutes: 0,
  createdBy: 'usr_1',
  createdAt: 1788400000,
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAccess.mockResolvedValue({
    response: null,
    orgId: 'org_1',
    userId: 'usr_1',
  })
  mocks.update.mockResolvedValue({ data: dependency, error: null })
  mocks.remove.mockResolvedValue({
    data: { object: 'issue-dependency', id: 'isd_1', deleted: true },
    error: null,
  })
})

describe('PATCH /api/issues/[issueRef]/dependencies/[dependencyId]', () => {
  it('requires the issues edit permission', async () => {
    await PATCH(patchRequest({ lagMinutes: 0 }), context())

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'issues',
      permission: 'issues.edit',
    })
  })

  it('updates the decoded dependency with its type and lag', async () => {
    const response = await PATCH(
      patchRequest({ type: 'start-to-finish', lagMinutes: 90 }),
      context('CONSOLE%2F2', 'isd%2F1')
    )

    expect(response.status).toBe(200)
    expect(mocks.update).toHaveBeenCalledWith('org_1', 'CONSOLE/2', 'isd/1', {
      type: 'start-to-finish',
      lagMinutes: 90,
    })
  })

  it('returns the updated dependency in the data envelope', async () => {
    const response = await PATCH(patchRequest({ lagMinutes: 0 }), context())

    expect(await response.json()).toEqual({ data: dependency, error: null })
  })

  it('rejects an empty update body', async () => {
    const response = await PATCH(patchRequest({}), context())

    expect(response.status).toBe(422)
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('rejects an unknown dependency type', async () => {
    const response = await PATCH(patchRequest({ type: 'depends-on' }), context())

    expect(response.status).toBe(422)
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('maps a cycle rejection to 422', async () => {
    mocks.update.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/issue-dependency-cycle',
        message: 'That dependency would create a cycle.',
      },
    })

    const response = await PATCH(patchRequest({ lagMinutes: 15 }), context())

    expect(response.status).toBe(422)
  })

  it('maps a dependency that is not on this work item to 404', async () => {
    mocks.update.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/issue-dependency-not-found',
        message: 'That dependency does not exist.',
      },
    })

    const response = await PATCH(patchRequest({ lagMinutes: 15 }), context())

    expect(response.status).toBe(404)
  })
})

describe('DELETE /api/issues/[issueRef]/dependencies/[dependencyId]', () => {
  it('requires the issues edit permission', async () => {
    await DELETE(new Request('http://localhost'), context())

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'issues',
      permission: 'issues.edit',
    })
  })

  it('removes the decoded dependency and returns its tombstone', async () => {
    const response = await DELETE(
      new Request('http://localhost'),
      context('CONSOLE-2', 'isd_9')
    )

    expect(response.status).toBe(200)
    expect(mocks.remove).toHaveBeenCalledWith('org_1', 'CONSOLE-2', 'isd_9')
    expect(await response.json()).toEqual({
      data: { object: 'issue-dependency', id: 'isd_1', deleted: true },
      error: null,
    })
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
