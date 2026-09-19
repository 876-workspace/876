import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  list: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/clients/projects', () => ({
  projects: { projectTemplates: { list: mocks.list } },
}))

const { GET } = await import('./route')

const TEMPLATE = {
  object: 'projects.project-template',
  id: 'tpl_1',
  key: 'agile-sprint',
  name: 'Agile sprint',
  description: null,
  currentVersion: 1,
  sourceProjectId: null,
  counts: { phases: 1, taskLists: 1, workItems: 2, dependencies: 0 },
  createdAt: 1788220800,
  updatedAt: 1788220800,
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAccess.mockResolvedValue({
    response: null,
    orgId: 'org_1',
    userId: 'usr_1',
  })
  mocks.list.mockResolvedValue({
    data: { object: 'list', data: [TEMPLATE] },
    error: null,
  })
})

describe('GET /api/project-templates', () => {
  it('requires the projects view permission', async () => {
    await GET()

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.view',
    })
  })

  it('returns the template list in the data envelope', async () => {
    const response = await GET()

    expect(await response.json()).toEqual({
      data: { object: 'list', data: [TEMPLATE] },
      error: null,
    })
  })

  it('returns authorization failures without touching the service', async () => {
    mocks.requireAccess.mockResolvedValue({
      response: new Response(null, { status: 403 }),
    })

    const response = await GET()

    expect(response.status).toBe(403)
    expect(mocks.list).not.toHaveBeenCalled()
  })

  it('answers a service failure with its message', async () => {
    mocks.list.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/tenant-not-found',
        message: 'That organization does not exist.',
      },
    })

    const response = await GET()

    expect(response.status).toBe(404)
    expect(await response.json()).toMatchObject({
      data: null,
      error: {
        code: 'error/not-found',
        message: 'That organization does not exist.',
      },
    })
  })
})
