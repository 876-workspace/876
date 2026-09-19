import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  budgetVariance: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/clients/projects', () => ({
  projects: { reports: { budgetVariance: mocks.budgetVariance } },
}))

const { GET } = await import('./route')

const PERIOD_QUERY = '?from=1788220800&to=1790812800'

const REPORT = {
  object: 'projects.budget-variance-report',
  period: { from: 1788220800, to: 1790812800 },
  data: [
    {
      projectId: 'prj_1',
      name: 'Apollo',
      currency: 'USD',
      budgetMinor: '100000',
      actualCostMinor: '125000',
      varianceMinor: '-25000',
      budgetMinutes: 600,
      actualMinutes: 750,
    },
  ],
}

function request(search: string) {
  return new Request(`http://localhost/api/reports/budget-variance${search}`)
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAccess.mockResolvedValue({
    response: null,
    orgId: 'org_1',
    userId: 'usr_1',
  })
  mocks.budgetVariance.mockResolvedValue({ data: REPORT, error: null })
})

describe('GET /api/reports/budget-variance', () => {
  it('requires the projects view permission', async () => {
    await GET(request(PERIOD_QUERY))

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.view',
    })
  })

  it('returns the variance for the requested period', async () => {
    const response = await GET(request(PERIOD_QUERY))

    expect(mocks.budgetVariance).toHaveBeenCalledWith('org_1', {
      from: 1788220800,
      to: 1790812800,
    })
    expect(await response.json()).toEqual({ data: REPORT, error: null })
  })

  it('rejects a period that does not move forward', async () => {
    const response = await GET(request('?from=1790812800&to=1790812800'))

    expect(response.status).toBe(422)
    expect(mocks.budgetVariance).not.toHaveBeenCalled()
  })

  it('streams the csv the service rendered as a download', async () => {
    mocks.budgetVariance.mockResolvedValue({
      data: 'project,variance\n',
      error: null,
    })

    const response = await GET(request(`${PERIOD_QUERY}&format=csv`))

    expect(mocks.budgetVariance).toHaveBeenCalledWith('org_1', {
      from: 1788220800,
      to: 1790812800,
      format: 'csv',
    })
    expect(response.headers.get('content-type')).toBe('text/csv; charset=utf-8')
    expect(response.headers.get('content-disposition')).toBe(
      'attachment; filename="budget-variance-report.csv"'
    )
    expect(await response.text()).toBe('project,variance\n')
  })

  it('reports an unexpected service failure without a specific status', async () => {
    mocks.budgetVariance.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/report-exploded',
        message: 'The report could not be produced.',
      },
    })

    const response = await GET(request(PERIOD_QUERY))

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      data: null,
      error: {
        code: 'error/bad-request',
        message: 'The report could not be produced.',
      },
    })
  })

  it('answers the authorization failure without touching the service', async () => {
    mocks.requireAccess.mockResolvedValue({
      response: new Response(null, { status: 401 }),
    })

    const response = await GET(request(PERIOD_QUERY))

    expect(response.status).toBe(401)
    expect(mocks.budgetVariance).not.toHaveBeenCalled()
  })
})
