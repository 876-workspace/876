import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  create: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/clients/projects', () => ({
  projects: { issueDependencies: { create: mocks.create } },
}))

const { POST } = await import('./route')

function context(issueRef = 'CONSOLE-2') {
  return { params: Promise.resolve({ issueRef }) }
}

function request(body: unknown) {
  return new Request('http://localhost/api/issues/CONSOLE-2/dependencies', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const dependency = {
  object: 'issue-dependency',
  id: 'isd_1',
  tenantId: 'tnt_1',
  predecessorIssueId: 'iss_1',
  successorIssueId: 'iss_2',
  type: 'finish-to-start',
  lagMinutes: 60,
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
  mocks.create.mockResolvedValue({ data: dependency, error: null })
})

describe('POST /api/issues/[issueRef]/dependencies', () => {
  it('requires the issues edit permission', async () => {
    await POST(
      request({ predecessorIssueId: 'iss_1', successorIssueId: 'iss_2' }),
      context()
    )

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'issues',
      permission: 'issues.edit',
    })
  })

  it('creates the dependency between both endpoints for the authenticated actor', async () => {
    const response = await POST(
      request({
        predecessorIssueId: 'iss_1',
        successorIssueId: 'iss_2',
        type: 'start-to-start',
        lagMinutes: -30,
      }),
      context('CONSOLE%2F2')
    )

    expect(response.status).toBe(201)
    expect(mocks.create).toHaveBeenCalledWith('org_1', 'CONSOLE/2', {
      predecessorIssueId: 'iss_1',
      successorIssueId: 'iss_2',
      type: 'start-to-start',
      lagMinutes: -30,
      actorUserId: 'usr_1',
    })
  })

  it('returns the created dependency in the data envelope', async () => {
    const response = await POST(
      request({ predecessorIssueId: 'iss_1', successorIssueId: 'iss_2' }),
      context()
    )

    expect(await response.json()).toEqual({ data: dependency, error: null })
  })

  it('rejects unknown fields so the browser cannot submit actorUserId', async () => {
    const response = await POST(
      request({
        predecessorIssueId: 'iss_1',
        successorIssueId: 'iss_2',
        actorUserId: 'usr_attacker',
      }),
      context()
    )

    expect(response.status).toBe(422)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('rejects a lag that is not a whole minute count', async () => {
    const response = await POST(
      request({
        predecessorIssueId: 'iss_1',
        successorIssueId: 'iss_2',
        lagMinutes: 1.5,
      }),
      context()
    )

    expect(response.status).toBe(422)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('returns authorization failures without touching the service', async () => {
    mocks.requireAccess.mockResolvedValue({
      response: new Response(null, { status: 403 }),
    })

    const response = await POST(
      request({ predecessorIssueId: 'iss_1', successorIssueId: 'iss_2' }),
      context()
    )

    expect(response.status).toBe(403)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('maps a dependency that would create a cycle to 422', async () => {
    mocks.create.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/issue-dependency-cycle',
        message: 'That dependency would create a cycle.',
      },
    })

    const response = await POST(
      request({ predecessorIssueId: 'iss_2', successorIssueId: 'iss_1' }),
      context()
    )

    expect(response.status).toBe(422)
  })

  it('maps an existing dependency to 409', async () => {
    mocks.create.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/issue-dependency-exists',
        message: 'That dependency already exists.',
      },
    })

    const response = await POST(
      request({ predecessorIssueId: 'iss_1', successorIssueId: 'iss_2' }),
      context()
    )

    expect(response.status).toBe(409)
  })

  it('maps a missing endpoint to 404', async () => {
    mocks.create.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/issue-not-found',
        message: 'That work item does not exist.',
      },
    })

    const response = await POST(
      request({ predecessorIssueId: 'iss_missing', successorIssueId: 'iss_2' }),
      context()
    )

    expect(response.status).toBe(404)
  })
})
