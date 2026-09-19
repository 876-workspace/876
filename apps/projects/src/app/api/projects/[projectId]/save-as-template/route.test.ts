import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  saveAsTemplate: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/clients/projects', () => ({
  projects: { projects: { saveAsTemplate: mocks.saveAsTemplate } },
}))

const { POST } = await import('./route')

const context = { params: Promise.resolve({ projectId: 'prj_1' }) }

const TEMPLATE = {
  object: 'projects.project-template',
  id: 'tpl_1',
  key: 'apollo',
  name: 'Apollo',
}

function post(body: unknown) {
  return new Request('http://localhost/api/projects/prj_1/save-as-template', {
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
  mocks.saveAsTemplate.mockResolvedValue({ data: TEMPLATE, error: null })
})

describe('POST /api/projects/[projectId]/save-as-template', () => {
  it('requires the projects edit permission', async () => {
    await POST(post({ key: 'apollo' }), context)

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.edit',
    })
  })

  it('saves the template with one service call and answers 201', async () => {
    const response = await POST(
      post({ key: 'apollo', name: 'Apollo', description: null }),
      context
    )

    expect(response.status).toBe(201)
    expect(mocks.saveAsTemplate).toHaveBeenCalledWith('org_1', 'prj_1', {
      key: 'apollo',
      name: 'Apollo',
      description: null,
    })
    expect(await response.json()).toEqual({ data: TEMPLATE, error: null })
  })

  it('rejects a missing key', async () => {
    const response = await POST(post({ name: 'Apollo' }), context)

    expect(response.status).toBe(422)
    expect(mocks.saveAsTemplate).not.toHaveBeenCalled()
  })

  it('maps a taken template key to 409', async () => {
    mocks.saveAsTemplate.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/template-key-taken',
        message: 'That key is taken.',
      },
    })

    const response = await POST(post({ key: 'apollo' }), context)

    expect(response.status).toBe(409)
  })
})
