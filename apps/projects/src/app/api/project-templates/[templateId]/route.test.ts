import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  retrieve: vi.fn(),
  update: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/services/projects', () => ({
  projects: {
    projectTemplates: { retrieve: mocks.retrieve, update: mocks.update },
  },
}))

const { GET, PATCH } = await import('./route')

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

const context = { params: Promise.resolve({ templateId: 'tpl_1' }) }

function patch(body: unknown) {
  return new Request('http://localhost/api/project-templates/tpl_1', {
    method: 'PATCH',
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
  mocks.retrieve.mockResolvedValue({ data: TEMPLATE, error: null })
  mocks.update.mockResolvedValue({ data: TEMPLATE, error: null })
})

describe('GET /api/project-templates/[templateId]', () => {
  it('requires the projects view permission', async () => {
    await GET(new Request('http://localhost/api'), context)

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.view',
    })
  })

  it('returns the template in the data envelope', async () => {
    const response = await GET(new Request('http://localhost/api'), context)

    expect(mocks.retrieve).toHaveBeenCalledWith('org_1', 'tpl_1')
    expect(await response.json()).toEqual({ data: TEMPLATE, error: null })
  })

  it('maps a missing template to 404', async () => {
    mocks.retrieve.mockResolvedValue({
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

describe('PATCH /api/project-templates/[templateId]', () => {
  it('requires the projects edit permission', async () => {
    await PATCH(patch({ name: 'Agile', description: null }), context)

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.edit',
    })
  })

  it('saves the name and description through the service', async () => {
    const response = await PATCH(
      patch({ name: 'Agile', description: null }),
      context
    )

    expect(mocks.update).toHaveBeenCalledWith('org_1', 'tpl_1', {
      name: 'Agile',
      description: null,
    })
    expect(await response.json()).toEqual({ data: TEMPLATE, error: null })
  })

  it('rejects an unknown field', async () => {
    const response = await PATCH(
      patch({ name: 'Agile', description: null, tenantId: 't_attacker' }),
      context
    )

    expect(response.status).toBe(422)
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('rejects an empty name', async () => {
    const response = await PATCH(
      patch({ name: '  ', description: null }),
      context
    )

    expect(response.status).toBe(422)
    expect(mocks.update).not.toHaveBeenCalled()
  })
})
