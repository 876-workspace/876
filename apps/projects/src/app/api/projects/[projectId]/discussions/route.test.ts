import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  create: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/clients/projects', () => ({
  projects: { discussions: { create: mocks.create } },
}))

const { POST } = await import('./route')

function request(body: unknown) {
  return new Request('http://localhost/api/projects/prj_1/discussions', {
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
    data: { object: 'projects.discussion', id: 'dis_1' },
    error: null,
  })
})

describe('POST /api/projects/[projectId]/discussions', () => {
  it('requires the projects view permission to start a discussion', async () => {
    await POST(request({ title: 'Launch', body: 'Opening post' }), context)

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.view',
    })
  })

  it('attributes the discussion to the session user', async () => {
    const response = await POST(
      request({ title: 'Launch', body: 'Opening post' }),
      context
    )

    expect(response.status).toBe(201)
    expect(mocks.create).toHaveBeenCalledWith('org_1', 'prj_1', {
      title: 'Launch',
      body: 'Opening post',
      authorUserId: 'usr_1',
    })
  })

  it('rejects discussions without a title and opening post', async () => {
    const response = await POST(request({ title: '', body: '' }), context)

    expect(response.status).toBe(422)
    expect(mocks.create).not.toHaveBeenCalled()
  })
})
