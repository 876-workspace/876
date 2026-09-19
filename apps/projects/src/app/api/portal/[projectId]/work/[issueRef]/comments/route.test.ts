import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  resolveAccess: vi.fn(),
  createIssueComment: vi.fn(),
}))

vi.mock('@/lib/portal-access', () => ({
  resolvePortalApiAccess: mocks.resolveAccess,
}))
vi.mock('@/lib/clients/portal', () => ({
  getPortalClient: () => ({
    createIssueComment: mocks.createIssueComment,
  }),
}))

const { POST } = await import('./route')

function request(body: unknown) {
  return new Request('http://localhost/api/portal/prj_1/work/ALPHA-7/comments', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const context = {
  params: Promise.resolve({ projectId: 'prj_1', issueRef: 'ALPHA-7' }),
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.resolveAccess.mockResolvedValue({
    access: { orgId: 'org_1', userId: 'usr_client' },
  })
  mocks.createIssueComment.mockResolvedValue({
    data: {
      object: 'portal.comment',
      id: 'cmt_1',
      issueId: 'iss_1',
      authorUserId: 'usr_client',
      body: 'Hello',
      createdAt: 1787767400,
      updatedAt: 1787767400,
    },
    error: null,
  })
})

describe('POST /api/portal/[projectId]/work/[issueRef]/comments', () => {
  it('denies without a live grant instead of leaking existence', async () => {
    mocks.resolveAccess.mockResolvedValue({
      access: undefined,
      response: new Response(JSON.stringify({ error: 'Not found.' }), {
        status: 404,
      }),
    })

    const response = await POST(request({ body: 'Hello' }), context)

    expect(response.status).toBe(404)
    expect(mocks.createIssueComment).not.toHaveBeenCalled()
  })

  it('rejects empty comments', async () => {
    const response = await POST(request({ body: '' }), context)

    expect(response.status).toBe(422)
    expect(mocks.createIssueComment).not.toHaveBeenCalled()
  })

  it('delegates the verified write to the portal client', async () => {
    const response = await POST(request({ body: 'Hello' }), context)

    expect(response.status).toBe(201)
    expect(mocks.createIssueComment).toHaveBeenCalledWith(
      'org_1',
      'prj_1',
      'ALPHA-7',
      { body: 'Hello' }
    )
    const payload = await response.json()
    expect(payload.data.object).toBe('portal.comment')
    expect(payload.data).not.toHaveProperty('tenantId')
  })

  it('hides issues outside the client grant', async () => {
    mocks.createIssueComment.mockResolvedValue({
      data: null,
      error: { code: 'projects/issue-not-found', message: 'Not found.' },
    })

    const response = await POST(request({ body: 'Hello' }), context)

    expect(response.status).toBe(404)
    const payload = await response.json()
    expect(payload.error.message).toBe('Not found.')
  })
})
