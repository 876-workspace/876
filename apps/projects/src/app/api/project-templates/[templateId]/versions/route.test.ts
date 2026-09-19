import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  versions: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/clients/projects', () => ({
  projects: { projectTemplates: { versions: mocks.versions } },
}))

const { GET } = await import('./route')

const context = { params: Promise.resolve({ templateId: 'tpl_1' }) }

const VERSIONS = {
  object: 'list',
  data: [
    {
      object: 'projects.project-template-version',
      id: 'ver_1',
      templateId: 'tpl_1',
      version: 1,
      createdAt: 1788220800,
    },
  ],
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAccess.mockResolvedValue({
    response: null,
    orgId: 'org_1',
    userId: 'usr_1',
  })
  mocks.versions.mockResolvedValue({ data: VERSIONS, error: null })
})

describe('GET /api/project-templates/[templateId]/versions', () => {
  it('requires the projects view permission', async () => {
    await GET(new Request('http://localhost/api'), context)

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.view',
    })
  })

  it('returns the version list in the data envelope', async () => {
    const response = await GET(new Request('http://localhost/api'), context)

    expect(mocks.versions).toHaveBeenCalledWith('org_1', 'tpl_1')
    expect(await response.json()).toEqual({ data: VERSIONS, error: null })
  })

  it('maps a missing template to 404', async () => {
    mocks.versions.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/template-not-found',
        message: 'That template does not exist.',
      },
    })

    const response = await GET(new Request('http://localhost/api'), context)

    expect(response.status).toBe(404)
  })
})
