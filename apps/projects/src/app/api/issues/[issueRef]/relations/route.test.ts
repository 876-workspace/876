import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  create: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/clients/projects', () => ({
  projects: { issueRelations: { create: mocks.create } },
}))

const { POST } = await import('./route')

function context(issueRef = 'CONSOLE-2') {
  return { params: Promise.resolve({ issueRef }) }
}

function request(body: unknown) {
  return new Request('http://localhost/api/issues/CONSOLE-2/relations', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const relation = {
  object: 'issue-relation',
  id: 'isr_1',
  tenantId: 'tnt_1',
  sourceIssueId: 'iss_1',
  targetIssueId: 'iss_2',
  type: 'relates-to',
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
  mocks.create.mockResolvedValue({ data: relation, error: null })
})

describe('POST /api/issues/[issueRef]/relations', () => {
  it('requires the issues edit permission', async () => {
    await POST(
      request({ targetIssueId: 'iss_2', type: 'relates-to' }),
      context()
    )

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'issues',
      permission: 'issues.edit',
    })
  })

  it('creates the relationship on the decoded work item for the authenticated actor', async () => {
    const response = await POST(
      request({ targetIssueId: 'iss_2', type: 'blocks' }),
      context('CONSOLE%2F2')
    )

    expect(response.status).toBe(201)
    expect(mocks.create).toHaveBeenCalledWith('org_1', 'CONSOLE/2', {
      targetIssueId: 'iss_2',
      type: 'blocks',
      actorUserId: 'usr_1',
    })
  })

  it('returns the created relationship in the data envelope', async () => {
    const response = await POST(
      request({ targetIssueId: 'iss_2', type: 'relates-to' }),
      context()
    )

    expect(await response.json()).toEqual({ data: relation, error: null })
  })

  it('rejects unknown fields so the browser cannot submit actorUserId', async () => {
    const response = await POST(
      request({
        targetIssueId: 'iss_2',
        type: 'relates-to',
        actorUserId: 'usr_attacker',
      }),
      context()
    )

    expect(response.status).toBe(422)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('rejects an unknown relationship type', async () => {
    const response = await POST(
      request({ targetIssueId: 'iss_2', type: 'parent-of' }),
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
      request({ targetIssueId: 'iss_2', type: 'relates-to' }),
      context()
    )

    expect(response.status).toBe(403)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('maps a duplicate relationship to 409', async () => {
    mocks.create.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/issue-relation-exists',
        message: 'That relationship already exists.',
      },
    })

    const response = await POST(
      request({ targetIssueId: 'iss_2', type: 'relates-to' }),
      context()
    )

    expect(response.status).toBe(409)
  })

  it('maps a missing work item to 404', async () => {
    mocks.create.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/issue-not-found',
        message: 'That work item does not exist.',
      },
    })

    const response = await POST(
      request({ targetIssueId: 'iss_missing', type: 'relates-to' }),
      context()
    )

    expect(response.status).toBe(404)
  })
})
