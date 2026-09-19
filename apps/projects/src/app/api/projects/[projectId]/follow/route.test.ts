import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  follow: vi.fn(),
  unfollow: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/clients/projects', () => ({
  projects: {
    followers: { follow: mocks.follow, unfollow: mocks.unfollow },
  },
}))

const { POST } = await import('./route')

function request(body: unknown) {
  return new Request('http://localhost/api/projects/prj_1/follow', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const context = { params: Promise.resolve({ projectId: 'prj_1' }) }

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAccess.mockResolvedValue({
    response: null,
    orgId: 'org_1',
    userId: 'usr_1',
  })
  mocks.follow.mockResolvedValue({ data: { following: true }, error: null })
  mocks.unfollow.mockResolvedValue({ data: { following: false }, error: null })
})

describe('POST /api/projects/[projectId]/follow', () => {
  it('requires the projects view permission', async () => {
    await POST(request({ following: true }), context)

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.view',
    })
  })

  it('follows with the session user, never a browser user id', async () => {
    const response = await POST(request({ following: true }), context)

    expect(response.status).toBe(200)
    expect(mocks.follow).toHaveBeenCalledWith('org_1', {
      subjectType: 'project',
      subjectId: 'prj_1',
      userId: 'usr_1',
    })
    expect(mocks.unfollow).not.toHaveBeenCalled()
  })

  it('unfollows when the browser sends following false', async () => {
    const response = await POST(request({ following: false }), context)

    expect(response.status).toBe(200)
    expect(mocks.unfollow).toHaveBeenCalledWith('org_1', {
      subjectType: 'project',
      subjectId: 'prj_1',
      userId: 'usr_1',
    })
    expect(mocks.follow).not.toHaveBeenCalled()
  })

  it('rejects bodies that are not a follow update', async () => {
    const response = await POST(request({ following: 'yes' }), context)

    expect(response.status).toBe(422)
    expect(mocks.follow).not.toHaveBeenCalled()
    expect(mocks.unfollow).not.toHaveBeenCalled()
  })
})
