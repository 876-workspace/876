import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  preview: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/clients/projects', () => ({
  projects: { projectTemplates: { preview: mocks.preview } },
}))

const { POST } = await import('./route')

const context = { params: Promise.resolve({ templateId: 'tpl_1' }) }

const PREVIEW = {
  object: 'projects.template-preview',
  startDate: 1788220800,
  phases: [],
  workItems: [],
  missing: { workItemTypes: [], workflowStates: [], labels: [] },
}

function post(body: unknown) {
  return new Request('http://localhost/api/project-templates/tpl_1/preview', {
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
  mocks.preview.mockResolvedValue({ data: PREVIEW, error: null })
})

describe('POST /api/project-templates/[templateId]/preview', () => {
  it('requires the projects view permission', async () => {
    await POST(post({ startDate: 1788220800 }), context)

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.view',
    })
  })

  it('builds the preview with the start date and include flags', async () => {
    const response = await POST(
      post({
        startDate: 1788220800,
        includeWorkItems: true,
        includeDependencies: false,
        includeBudgets: true,
      }),
      context
    )

    expect(mocks.preview).toHaveBeenCalledWith('org_1', 'tpl_1', {
      startDate: 1788220800,
      includeWorkItems: true,
      includeDependencies: false,
      includeBudgets: true,
    })
    expect(await response.json()).toEqual({ data: PREVIEW, error: null })
  })

  it('rejects a missing start date', async () => {
    const response = await POST(post({}), context)

    expect(response.status).toBe(422)
    expect(mocks.preview).not.toHaveBeenCalled()
  })

  it('maps missing references to 422', async () => {
    mocks.preview.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/template-missing-references',
        message: 'Unknown work item type: bug.',
      },
    })

    const response = await POST(post({ startDate: 1788220800 }), context)

    expect(response.status).toBe(422)
  })
})
