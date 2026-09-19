import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  summary: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/clients/projects', () => ({
  projects: { projectBilling: { financialSummary: mocks.summary } },
}))

const { GET } = await import('./route')

const context = { params: Promise.resolve({ projectId: 'prj_1' }) }

function get(query: string) {
  return new Request(`http://localhost/api/projects/prj_1/financial-summary${query}`)
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAccess.mockResolvedValue({
    response: null,
    orgId: 'org_1',
    userId: 'usr_1',
  })
  mocks.summary.mockResolvedValue({
    data: { object: 'projects.financial-summary' },
    error: null,
  })
})

describe('GET /api/projects/[projectId]/financial-summary', () => {
  it('requires the projects view permission', async () => {
    await GET(get('?from=1&to=2'), context)

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.view',
    })
  })

  it('forwards the period to the owning client', async () => {
    const response = await GET(get('?from=1704067200&to=1706745600'), context)

    expect(response.status).toBe(200)
    expect(mocks.summary).toHaveBeenCalledWith('org_1', 'prj_1', {
      from: 1704067200,
      to: 1706745600,
    })
  })

  it('rejects a missing period', async () => {
    const response = await GET(get(''), context)

    expect(response.status).toBe(422)
    expect(mocks.summary).not.toHaveBeenCalled()
  })

  it('rejects a period where to is not after from', async () => {
    const response = await GET(get('?from=5&to=5'), context)

    expect(response.status).toBe(422)
    expect(mocks.summary).not.toHaveBeenCalled()
  })
})
