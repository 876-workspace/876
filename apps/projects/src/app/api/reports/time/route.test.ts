import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  time: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/services/projects', () => ({
  projects: { reports: { time: mocks.time } },
}))

const { GET } = await import('./route')

const PERIOD_QUERY = 'from=1788220800&to=1790812800'

const TIME_REPORT = {
  object: 'projects.time-report',
  groupBy: 'project',
  period: { from: 1788220800, to: 1790812800 },
  data: [
    {
      key: 'prj_1',
      label: 'Apollo',
      billableMinutes: 90,
      nonBillableMinutes: 30,
    },
  ],
}

function request(search: string) {
  return new Request(`http://localhost/api/reports/time?${search}`)
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAccess.mockResolvedValue({
    response: null,
    orgId: 'org_1',
    userId: 'usr_1',
  })
  mocks.time.mockResolvedValue({ data: TIME_REPORT, error: null })
})

describe('GET /api/reports/time', () => {
  it('requires the projects view permission', async () => {
    await GET(request(PERIOD_QUERY))

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.view',
    })
  })

  it('returns time grouped by the requested dimension', async () => {
    const response = await GET(request(`${PERIOD_QUERY}&groupBy=user`))

    expect(mocks.time).toHaveBeenCalledWith('org_1', {
      groupBy: 'user',
      from: 1788220800,
      to: 1790812800,
      projectId: undefined,
    })
    expect(await response.json()).toEqual({ data: TIME_REPORT, error: null })
  })

  it('groups by project when the query names no dimension', async () => {
    await GET(request(PERIOD_QUERY))

    expect(mocks.time).toHaveBeenCalledWith('org_1', {
      groupBy: 'project',
      from: 1788220800,
      to: 1790812800,
      projectId: undefined,
    })
  })

  it('rejects a dimension the report cannot group by', async () => {
    const response = await GET(request(`${PERIOD_QUERY}&groupBy=team`))

    expect(response.status).toBe(422)
    expect(mocks.time).not.toHaveBeenCalled()
  })

  it('streams the grouped csv as a download', async () => {
    mocks.time.mockResolvedValue({ data: 'group,billable\n', error: null })

    const response = await GET(
      request(`${PERIOD_QUERY}&groupBy=issue&format=csv`)
    )

    expect(mocks.time).toHaveBeenCalledWith('org_1', {
      groupBy: 'issue',
      from: 1788220800,
      to: 1790812800,
      projectId: undefined,
      format: 'csv',
    })
    expect(response.headers.get('content-disposition')).toBe(
      'attachment; filename="time-report.csv"'
    )
    expect(await response.text()).toBe('group,billable\n')
  })

  it('reports a period the service refuses as an invalid period', async () => {
    mocks.time.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/invalid-period',
        message: 'Enter a valid report period.',
      },
    })

    const response = await GET(request(PERIOD_QUERY))

    expect(response.status).toBe(422)
  })

  it('answers the authorization failure without touching the service', async () => {
    mocks.requireAccess.mockResolvedValue({
      response: new Response(null, { status: 401 }),
    })

    const response = await GET(request(PERIOD_QUERY))

    expect(response.status).toBe(401)
    expect(mocks.time).not.toHaveBeenCalled()
  })
})
