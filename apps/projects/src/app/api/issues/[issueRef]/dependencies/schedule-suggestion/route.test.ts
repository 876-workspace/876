import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  suggest: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/clients/projects', () => ({
  projects: { issueDependencies: { suggestSchedule: mocks.suggest } },
}))

const { POST } = await import('./route')

function context(issueRef = 'CONSOLE-2') {
  return { params: Promise.resolve({ issueRef }) }
}

function request() {
  return new Request(
    'http://localhost/api/issues/CONSOLE-2/dependencies/schedule-suggestion',
    { method: 'POST' }
  )
}

const suggestion = {
  earliestStart: 1788480000,
  earliestFinish: 1788825600,
  constrainedBy: [
    {
      issueId: 'iss_1',
      identifier: 'CONSOLE-1',
      type: 'finish-to-start',
      lagMinutes: 60,
    },
  ],
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAccess.mockResolvedValue({
    response: null,
    orgId: 'org_1',
    userId: 'usr_1',
  })
  mocks.suggest.mockResolvedValue({ data: suggestion, error: null })
})

describe('POST /api/issues/[issueRef]/dependencies/schedule-suggestion', () => {
  it('requires only the issues view permission', async () => {
    await POST(request(), context())

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'issues',
      permission: 'issues.view',
    })
  })

  it('asks the service for the decoded work item schedule', async () => {
    const response = await POST(request(), context('CONSOLE%2F2'))

    expect(response.status).toBe(200)
    expect(mocks.suggest).toHaveBeenCalledTimes(1)
    expect(mocks.suggest).toHaveBeenCalledWith('org_1', 'CONSOLE/2')
  })

  it('returns the advisory suggestion in the data envelope', async () => {
    const response = await POST(request(), context())

    expect(await response.json()).toEqual({ data: suggestion, error: null })
  })

  it('returns authorization failures without touching the service', async () => {
    mocks.requireAccess.mockResolvedValue({
      response: new Response(null, { status: 403 }),
    })

    const response = await POST(request(), context())

    expect(response.status).toBe(403)
    expect(mocks.suggest).not.toHaveBeenCalled()
  })

  it('maps a missing work item to 404', async () => {
    mocks.suggest.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/issue-not-found',
        message: 'That work item does not exist.',
      },
    })

    const response = await POST(request(), context('CONSOLE-404'))

    expect(response.status).toBe(404)
  })
})
