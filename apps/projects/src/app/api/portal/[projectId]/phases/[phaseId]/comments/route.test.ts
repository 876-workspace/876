import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  resolveAccess: vi.fn(),
  createMilestoneComment: vi.fn(),
}))

vi.mock('@/lib/portal-access', () => ({
  resolvePortalApiAccess: mocks.resolveAccess,
}))
vi.mock('@/lib/services/portal', () => ({
  getPortalClient: () => ({
    createMilestoneComment: mocks.createMilestoneComment,
  }),
}))

const { POST } = await import('./route')

function request(body: unknown) {
  return new Request('http://localhost/api/portal/prj_1/phases/mls_1/comments', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const context = {
  params: Promise.resolve({ projectId: 'prj_1', phaseId: 'mls_1' }),
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.resolveAccess.mockResolvedValue({
    access: { orgId: 'org_1', userId: 'usr_client' },
  })
  mocks.createMilestoneComment.mockResolvedValue({
    data: {
      object: 'portal.milestone-comment',
      id: 'mcm_1',
      milestoneId: 'mls_1',
      authorUserId: 'usr_client',
      body: 'Phase note',
      createdAt: 1787767400,
      updatedAt: 1787767400,
    },
    error: null,
  })
})

describe('POST /api/portal/[projectId]/phases/[phaseId]/comments', () => {
  it('denies without a live grant instead of leaking existence', async () => {
    mocks.resolveAccess.mockResolvedValue({
      access: undefined,
      response: new Response(JSON.stringify({ error: 'Not found.' }), {
        status: 404,
      }),
    })

    const response = await POST(request({ body: 'Phase note' }), context)

    expect(response.status).toBe(404)
    expect(mocks.createMilestoneComment).not.toHaveBeenCalled()
  })

  it('rejects empty comments', async () => {
    const response = await POST(request({ body: '' }), context)

    expect(response.status).toBe(422)
    expect(mocks.createMilestoneComment).not.toHaveBeenCalled()
  })

  it('delegates the verified write to the portal client', async () => {
    const response = await POST(request({ body: 'Phase note' }), context)

    expect(response.status).toBe(201)
    expect(mocks.createMilestoneComment).toHaveBeenCalledWith(
      'org_1',
      'prj_1',
      'mls_1',
      { body: 'Phase note' }
    )
    const payload = await response.json()
    expect(payload.data.object).toBe('portal.milestone-comment')
    expect(payload.data).not.toHaveProperty('tenantId')
  })

  it('hides phases outside the client grant', async () => {
    mocks.createMilestoneComment.mockResolvedValue({
      data: null,
      error: { code: 'projects/milestone-not-found', message: 'Not found.' },
    })

    const response = await POST(request({ body: 'Phase note' }), context)

    expect(response.status).toBe(404)
  })
})
