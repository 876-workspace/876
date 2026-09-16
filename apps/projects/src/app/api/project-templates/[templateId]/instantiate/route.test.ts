import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  instantiate: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/services/projects', () => ({
  projects: { projectTemplates: { instantiate: mocks.instantiate } },
}))

const { POST } = await import('./route')

const context = { params: Promise.resolve({ templateId: 'tpl_1' }) }

const PROJECT = { object: 'projects.project', id: 'prj_2', name: 'Apollo' }

function post(body: unknown) {
  return new Request(
    'http://localhost/api/project-templates/tpl_1/instantiate',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAccess.mockResolvedValue({
    response: null,
    orgId: 'org_1',
    userId: 'usr_1',
  })
  mocks.instantiate.mockResolvedValue({ data: PROJECT, error: null })
})

describe('POST /api/project-templates/[templateId]/instantiate', () => {
  it('requires the projects edit permission', async () => {
    await POST(post({ name: 'Apollo', startDate: 1788220800 }), context)

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.edit',
    })
  })

  it('creates the project with one service call and answers 201', async () => {
    const body = {
      name: 'Apollo',
      key: 'APOLLO',
      startDate: 1788220800,
      idempotencyKey: 'idem_1',
      includeWorkItems: true,
      includeDependencies: true,
      includeBudgets: false,
    }
    const response = await POST(post(body), context)

    expect(response.status).toBe(201)
    expect(mocks.instantiate).toHaveBeenCalledWith('org_1', 'tpl_1', body)
    expect(await response.json()).toEqual({ data: PROJECT, error: null })
  })

  it('rejects a missing name', async () => {
    const response = await POST(post({ startDate: 1788220800 }), context)

    expect(response.status).toBe(422)
    expect(mocks.instantiate).not.toHaveBeenCalled()
  })

  it('maps a taken project key to 409', async () => {
    mocks.instantiate.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/project-key-taken',
        message: 'That key is taken.',
      },
    })

    const response = await POST(
      post({ name: 'Apollo', startDate: 1788220800 }),
      context
    )

    expect(response.status).toBe(409)
  })
})
