import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  clone: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/services/projects', () => ({
  projects: { projects: { clone: mocks.clone } },
}))

const { POST } = await import('./route')

const context = { params: Promise.resolve({ projectId: 'prj_1' }) }

const PROJECT = { object: 'projects.project', id: 'prj_2', name: 'Apollo copy' }

function post(body: unknown) {
  return new Request('http://localhost/api/projects/prj_1/clone', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAccess.mockResolvedValue({
    response: null,
    orgId: 'org_1',
    userId: 'usr_1',
  })
  mocks.clone.mockResolvedValue({ data: PROJECT, error: null })
})

describe('POST /api/projects/[projectId]/clone', () => {
  it('requires the projects edit permission', async () => {
    await POST(post({ name: 'Apollo copy' }), context)

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.edit',
    })
  })

  it('clones the project with one service call and answers 201', async () => {
    const response = await POST(
      post({ name: 'Apollo copy', key: 'APOLLO2' }),
      context
    )

    expect(response.status).toBe(201)
    expect(mocks.clone).toHaveBeenCalledWith('org_1', 'prj_1', {
      name: 'Apollo copy',
      key: 'APOLLO2',
    })
    expect(await response.json()).toEqual({ data: PROJECT, error: null })
  })

  it('rejects a missing name', async () => {
    const response = await POST(post({ key: 'APOLLO2' }), context)

    expect(response.status).toBe(422)
    expect(mocks.clone).not.toHaveBeenCalled()
  })

  it('maps a missing project to 404', async () => {
    mocks.clone.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/project-not-found',
        message: 'That project does not exist.',
      },
    })

    const response = await POST(post({ name: 'Apollo copy' }), context)

    expect(response.status).toBe(404)
  })
})
