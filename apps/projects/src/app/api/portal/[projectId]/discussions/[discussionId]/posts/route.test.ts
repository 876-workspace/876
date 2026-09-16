import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  resolveAccess: vi.fn(),
  createDiscussionPost: vi.fn(),
}))

vi.mock('@/lib/portal-access', () => ({
  resolvePortalApiAccess: mocks.resolveAccess,
}))
vi.mock('@/lib/services/portal', () => ({
  getPortalClient: () => ({
    createDiscussionPost: mocks.createDiscussionPost,
  }),
}))

const { POST } = await import('./route')

function request(body: unknown) {
  return new Request('http://localhost/api/portal/prj_1/discussions/dis_1', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const context = {
  params: Promise.resolve({ projectId: 'prj_1', discussionId: 'dis_1' }),
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.resolveAccess.mockResolvedValue({
    access: { orgId: 'org_1', userId: 'usr_client' },
  })
  mocks.createDiscussionPost.mockResolvedValue({
    data: {
      object: 'portal.discussion-post',
      id: 'post_1',
      discussionId: 'dis_1',
      authorUserId: 'usr_client',
      body: 'Hello',
      createdAt: 1787767400,
      updatedAt: 1787767400,
    },
    error: null,
  })
})

describe('POST /api/portal/[projectId]/discussions/[discussionId]/posts', () => {
  it('denies without a live grant instead of leaking existence', async () => {
    mocks.resolveAccess.mockResolvedValue({
      access: undefined,
      response: new Response(JSON.stringify({ error: 'Not found.' }), {
        status: 404,
      }),
    })

    const response = await POST(request({ body: 'Hello' }), context)

    expect(response.status).toBe(404)
    expect(mocks.createDiscussionPost).not.toHaveBeenCalled()
  })

  it('rejects empty replies', async () => {
    const response = await POST(request({ body: '' }), context)

    expect(response.status).toBe(422)
    expect(mocks.createDiscussionPost).not.toHaveBeenCalled()
  })

  it('delegates the verified write to the portal client', async () => {
    const response = await POST(request({ body: 'Hello' }), context)

    expect(response.status).toBe(201)
    expect(mocks.createDiscussionPost).toHaveBeenCalledWith(
      'org_1',
      'prj_1',
      'dis_1',
      { body: 'Hello' }
    )
    const payload = await response.json()
    expect(payload.data.object).toBe('portal.discussion-post')
    expect(payload.data).not.toHaveProperty('tenantId')
  })

  it('hides discussions outside the client grant', async () => {
    mocks.createDiscussionPost.mockResolvedValue({
      data: null,
      error: { code: 'projects/discussion-not-found', message: 'Not found.' },
    })

    const response = await POST(request({ body: 'Hello' }), context)

    expect(response.status).toBe(404)
  })

  it('maps a locked discussion to 409', async () => {
    mocks.createDiscussionPost.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/discussion-locked',
        message: 'This discussion is locked.',
      },
    })

    const response = await POST(request({ body: 'Hello' }), context)

    expect(response.status).toBe(409)
  })
})
