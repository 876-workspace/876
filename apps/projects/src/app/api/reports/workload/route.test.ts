import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  workload: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/services/projects', () => ({
  projects: { reports: { workload: mocks.workload } },
}))

const { GET } = await import('./route')

const PERIOD_QUERY = '?from=1788220800&to=1790812800'

const REPORT = {
  object: 'projects.workload-report',
  period: { from: 1788220800, to: 1790812800 },
  data: [
    {
      userId: 'usr_1',
      label: 'Ada',
      assignedOpenItems: 3,
      plannedMinutes: 600,
      loggedMinutes: 300,
      capacityMinutes: 2400,
      utilisationPercent: 25,
    },
  ],
}

function request(search: string) {
  return new Request(`http://localhost/api/reports/workload${search}`)
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAccess.mockResolvedValue({
    response: null,
    orgId: 'org_1',
    userId: 'usr_1',
  })
  mocks.workload.mockResolvedValue({ data: REPORT, error: null })
})

describe('GET /api/reports/workload', () => {
  it('requires the projects view permission', async () => {
    await GET(request(PERIOD_QUERY))

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.view',
    })
  })

  it('returns workload over the requested period', async () => {
    const response = await GET(request(PERIOD_QUERY))

    expect(mocks.workload).toHaveBeenCalledWith('org_1', {
      from: 1788220800,
      to: 1790812800,
      projectId: undefined,
    })
    expect(await response.json()).toEqual({ data: REPORT, error: null })
  })

  it('rejects a query key the report does not accept', async () => {
    const response = await GET(request(`${PERIOD_QUERY}&groupBy=user`))

    expect(response.status).toBe(422)
    expect(mocks.workload).not.toHaveBeenCalled()
  })

  it('streams the csv the service rendered as a download', async () => {
    mocks.workload.mockResolvedValue({ data: 'member,planned\n', error: null })

    const response = await GET(request(`${PERIOD_QUERY}&format=csv`))

    expect(mocks.workload).toHaveBeenCalledWith('org_1', {
      from: 1788220800,
      to: 1790812800,
      projectId: undefined,
      format: 'csv',
    })
    expect(response.headers.get('content-type')).toBe('text/csv; charset=utf-8')
    expect(response.headers.get('content-disposition')).toBe(
      'attachment; filename="workload-report.csv"'
    )
    expect(await response.text()).toBe('member,planned\n')
  })

  it('reports a missing project as not found', async () => {
    mocks.workload.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/project-not-found',
        message: 'That project does not exist.',
      },
    })

    const response = await GET(request(`${PERIOD_QUERY}&projectId=prj_9`))

    expect(response.status).toBe(404)
  })

  it('answers the authorization failure without touching the service', async () => {
    mocks.requireAccess.mockResolvedValue({
      response: new Response(null, { status: 401 }),
    })

    const response = await GET(request(PERIOD_QUERY))

    expect(response.status).toBe(401)
    expect(mocks.workload).not.toHaveBeenCalled()
  })
})
