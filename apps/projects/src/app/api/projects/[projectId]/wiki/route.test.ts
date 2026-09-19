import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  create: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/clients/projects', () => ({
  projects: { wiki: { create: mocks.create } },
}))

const { POST } = await import('./route')

function request(body: unknown) {
  return new Request('http://localhost/api/projects/prj_1/wiki', {
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
  mocks.create.mockResolvedValue({
    data: { object: 'projects.wiki-page', id: 'page_1' },
    error: null,
  })
})

describe('POST /api/projects/[projectId]/wiki', () => {
  it('requires the projects edit permission', async () => {
    await POST(request({ title: 'Home', body: 'Welcome' }), context)

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.edit',
    })
  })

  it('attributes the page to the session user', async () => {
    const response = await POST(
      request({ title: 'Home', body: 'Welcome', slug: 'home' }),
      context
    )

    expect(response.status).toBe(201)
    expect(mocks.create).toHaveBeenCalledWith('org_1', 'prj_1', {
      title: 'Home',
      body: 'Welcome',
      slug: 'home',
      authorUserId: 'usr_1',
    })
  })

  it('rejects slugs outside the slug format', async () => {
    const response = await POST(
      request({ title: 'Home', body: 'Welcome', slug: 'Not A Slug!' }),
      context
    )

    expect(response.status).toBe(422)
    expect(mocks.create).not.toHaveBeenCalled()
  })
})
