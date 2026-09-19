import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  work: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/clients/projects', () => ({
  projects: { reports: { work: mocks.work } },
}))

const { GET } = await import('./route')

const PERIOD_QUERY = '?from=1788220800&to=1790812800'

const WORK_REPORT = {
  object: 'projects.work-report',
  period: { from: 1788220800, to: 1790812800 },
  byState: [{ key: 'todo', label: 'Todo', count: 3 }],
  byType: [{ key: 'task', label: 'Task', count: 3 }],
  byAssignee: [{ key: 'usr_1', label: 'Ada', count: 3 }],
  overdue: 1,
  total: 3,
}

function request(search: string) {
  return new Request(`http://localhost/api/reports/work${search}`)
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAccess.mockResolvedValue({
    response: null,
    orgId: 'org_1',
    userId: 'usr_1',
  })
  mocks.work.mockResolvedValue({ data: WORK_REPORT, error: null })
})

describe('GET /api/reports/work', () => {
  it('requires the projects view permission', async () => {
    await GET(request(PERIOD_QUERY))

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.view',
    })
  })

  it('returns the report for the requested period in the data envelope', async () => {
    const response = await GET(request(PERIOD_QUERY))

    expect(mocks.work).toHaveBeenCalledWith('org_1', {
      from: 1788220800,
      to: 1790812800,
      projectId: undefined,
    })
    expect(await response.json()).toEqual({ data: WORK_REPORT, error: null })
  })

  it('narrows the report to one project when the query names one', async () => {
    await GET(request(`${PERIOD_QUERY}&projectId=prj_1`))

    expect(mocks.work).toHaveBeenCalledWith('org_1', {
      from: 1788220800,
      to: 1790812800,
      projectId: 'prj_1',
    })
  })

  it('rejects a period that does not move forward', async () => {
    const response = await GET(request('?from=1790812800&to=1788220800'))

    expect(response.status).toBe(422)
    expect(mocks.work).not.toHaveBeenCalled()
  })

  it('rejects a period that is not a pair of whole seconds', async () => {
    const response = await GET(request('?from=1.5&to=2'))

    expect(response.status).toBe(422)
    expect(mocks.work).not.toHaveBeenCalled()
  })

  it('rejects an export format it cannot produce', async () => {
    const response = await GET(request(`${PERIOD_QUERY}&format=pdf`))

    expect(response.status).toBe(422)
    expect(mocks.work).not.toHaveBeenCalled()
  })

  it('streams the csv the service rendered as a download', async () => {
    mocks.work.mockResolvedValue({ data: 'state,count\nTodo,3\n', error: null })

    const response = await GET(request(`${PERIOD_QUERY}&format=csv`))

    expect(mocks.work).toHaveBeenCalledWith('org_1', {
      from: 1788220800,
      to: 1790812800,
      projectId: undefined,
      format: 'csv',
    })
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('text/csv; charset=utf-8')
    expect(response.headers.get('content-disposition')).toBe(
      'attachment; filename="work-report.csv"'
    )
    expect(await response.text()).toBe('state,count\nTodo,3\n')
  })

  it('reports a missing project as not found', async () => {
    mocks.work.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/project-not-found',
        message: 'That project does not exist.',
      },
    })

    const response = await GET(request(`${PERIOD_QUERY}&projectId=prj_9`))

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({
      data: null,
      error: {
        code: 'error/not-found',
        message: 'That project does not exist.',
      },
    })
  })

  it('answers the authorization failure without touching the service', async () => {
    mocks.requireAccess.mockResolvedValue({
      response: new Response(null, { status: 401 }),
    })

    const response = await GET(request(PERIOD_QUERY))

    expect(response.status).toBe(401)
    expect(mocks.work).not.toHaveBeenCalled()
  })
})
