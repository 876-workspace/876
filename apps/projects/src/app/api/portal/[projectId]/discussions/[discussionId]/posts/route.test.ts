import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  resolveAccess: vi.fn(),
  retrieveDiscussion: vi.fn(),
  createPost: vi.fn(),
}))

vi.mock('@/lib/portal-access', () => ({
  resolvePortalApiAccess: mocks.resolveAccess,
}))
vi.mock('@/lib/services/portal', () => ({
  getPortalClient: () => ({
    retrieveDiscussion: mocks.retrieveDiscussion,
  }),
}))
vi.mock('@/lib/services/projects', () => ({
  projects: { discussions: { createPost: mocks.createPost } },
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
  mocks.retrieveDiscussion.mockResolvedValue({
    data: { object: 'projects.discussion', id: 'dis_1' },
    error: null,
  })
  mocks.createPost.mockResolvedValue({
    data: { object: 'projects.discussion-post', id: 'post_1' },
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
    expect(mocks.createPost).not.toHaveBeenCalled()
  })

  it('rejects empty replies', async () => {
    const response = await POST(request({ body: '' }), context)

    expect(response.status).toBe(422)
    expect(mocks.createPost).not.toHaveBeenCalled()
  })

  it('checks client visibility through the portal before writing', async () => {
    const response = await POST(request({ body: 'Hello' }), context)

    expect(response.status).toBe(201)
    expect(mocks.retrieveDiscussion).toHaveBeenCalledWith(
      'org_1',
      'prj_1',
      'dis_1'
    )
    expect(mocks.createPost).toHaveBeenCalledWith('org_1', 'prj_1', 'dis_1', {
      body: 'Hello',
      authorUserId: 'usr_client',
    })
  })

  it('hides discussions outside the client grant', async () => {
    mocks.retrieveDiscussion.mockResolvedValue({
      data: null,
      error: { code: 'projects/not-found', message: 'Not found.' },
    })

    const response = await POST(request({ body: 'Hello' }), context)

    expect(response.status).toBe(404)
    expect(mocks.createPost).not.toHaveBeenCalled()
  })
})
