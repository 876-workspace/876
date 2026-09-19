import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  testRule: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/clients/projects', () => ({
  projects: {
    automationRules: { test: mocks.testRule },
  },
}))

const { POST } = await import('./route')

const context = { params: Promise.resolve({ ruleId: 'arl_1' }) }

function request(body: unknown) {
  return new NextRequest('http://localhost/api/automation-rules/arl_1/test', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const dryRun = {
  object: 'projects.automation-test',
  ruleId: 'arl_1',
  subjectType: 'work-item',
  subjectId: 'PROJ-1',
  matched: true,
  conditions: [],
  plannedActions: [{ type: 'notify' }],
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAccess.mockResolvedValue({
    response: null,
    orgId: 'org_1',
    userId: 'user_1',
  })
  mocks.testRule.mockResolvedValue({ data: dryRun, error: null })
})

describe('POST /api/automation-rules/[ruleId]/test', () => {
  it('requires the projects view permission', async () => {
    await POST(request({ subjectId: 'PROJ-1' }), context)

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.view',
    })
  })

  it('dry-runs the rule against the work item identifier', async () => {
    const response = await POST(request({ subjectId: 'PROJ-1' }), context)

    expect(mocks.testRule).toHaveBeenCalledWith('org_1', 'arl_1', {
      subjectId: 'PROJ-1',
    })
    expect(response.status).toBe(200)
  })

  it('rejects a missing subject with 422', async () => {
    const response = await POST(request({}), context)

    expect(response.status).toBe(422)
    expect(mocks.testRule).not.toHaveBeenCalled()
  })

  it('returns 404 for an unknown subject', async () => {
    mocks.testRule.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/automation-subject-not-found',
        message: 'Missing.',
      },
    })

    expect(
      (await POST(request({ subjectId: 'PROJ-9' }), context)).status
    ).toBe(404)
  })
})
