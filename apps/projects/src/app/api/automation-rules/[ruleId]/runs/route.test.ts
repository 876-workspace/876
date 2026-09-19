import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  listRuns: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/clients/projects', () => ({
  projects: {
    automationRules: { listRuns: mocks.listRuns },
  },
}))

const { GET } = await import('./route')

const context = { params: Promise.resolve({ ruleId: 'arl_1' }) }

function request() {
  return new NextRequest('http://localhost/api/automation-rules/arl_1/runs')
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAccess.mockResolvedValue({
    response: null,
    orgId: 'org_1',
    userId: 'user_1',
  })
  mocks.listRuns.mockResolvedValue({
    data: { object: 'list', data: [] },
    error: null,
  })
})

describe('GET /api/automation-rules/[ruleId]/runs', () => {
  it('requires the projects view permission', async () => {
    await GET(request(), context)

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.view',
    })
  })

  it('lists runs for the rule', async () => {
    const response = await GET(request(), context)

    expect(mocks.listRuns).toHaveBeenCalledWith('org_1', 'arl_1')
    expect(response.status).toBe(200)
  })

  it('returns 404 for an unknown rule', async () => {
    mocks.listRuns.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/automation-rule-not-found',
        message: 'Missing.',
      },
    })

    expect((await GET(request(), context)).status).toBe(404)
  })
})
