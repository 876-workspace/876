import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  health: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/services/projects', () => ({
  projects: { reports: { health: mocks.health } },
}))

const { GET } = await import('./route')

const HEALTH_REPORT = {
  object: 'projects.health-report',
  data: [
    {
      projectId: 'prj_1',
      name: 'Apollo',
      health: 'on-track',
      progressPercent: 40,
      overdue: 0,
      openItems: 5,
      budgetConsumedPercent: 20,
    },
  ],
}

function request(search = '') {
  return new Request(`http://localhost/api/reports/health${search}`)
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAccess.mockResolvedValue({
    response: null,
    orgId: 'org_1',
    userId: 'usr_1',
  })
  mocks.health.mockResolvedValue({ data: HEALTH_REPORT, error: null })
})

describe('GET /api/reports/health', () => {
  it('requires the projects view permission', async () => {
    await GET(request())

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.view',
    })
  })

  it('returns the health report in the data envelope', async () => {
    const response = await GET(request())

    expect(mocks.health).toHaveBeenCalledWith('org_1')
    expect(await response.json()).toEqual({ data: HEALTH_REPORT, error: null })
  })

  it('streams the csv the service rendered as a download', async () => {
    mocks.health.mockResolvedValue({ data: 'project,health\n', error: null })

    const response = await GET(request('?format=csv'))

    expect(mocks.health).toHaveBeenCalledWith('org_1', { format: 'csv' })
    expect(response.headers.get('content-type')).toBe('text/csv; charset=utf-8')
    expect(response.headers.get('content-disposition')).toBe(
      'attachment; filename="health-report.csv"'
    )
    expect(await response.text()).toBe('project,health\n')
  })

  it('rejects an export format it cannot produce', async () => {
    const response = await GET(request('?format=xlsx'))

    expect(response.status).toBe(422)
    expect(mocks.health).not.toHaveBeenCalled()
  })

  it('reports an unconfigured service as unavailable', async () => {
    mocks.health.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/not-configured',
        message: 'The Projects client is not configured.',
      },
    })

    const response = await GET(request())

    expect(response.status).toBe(503)
  })

  it('answers the authorization failure without touching the service', async () => {
    mocks.requireAccess.mockResolvedValue({
      response: new Response(null, { status: 401 }),
    })

    const response = await GET(request())

    expect(response.status).toBe(401)
    expect(mocks.health).not.toHaveBeenCalled()
  })
})
