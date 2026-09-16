import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  retrieve: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/services/integration', () => ({
  integration: { retrieveImportJob: mocks.retrieve },
}))

const { GET } = await import('./route')

function context(jobId: string) {
  return { params: Promise.resolve({ jobId }) }
}

const job = {
  object: 'projects.import-job',
  id: 'impj_1',
  source: 'csv',
  status: 'preview',
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAccess.mockResolvedValue({ response: null, orgId: 'org_1', userId: 'user_1' })
  mocks.retrieve.mockResolvedValue({ data: job, error: null })
})

describe('GET /api/import-jobs/[jobId]', () => {
  it('requires the projects view permission', async () => {
    await GET(new NextRequest('http://localhost/x'), context('impj_1'))
    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.view',
    })
  })

  it('retrieves the decoded job for the organization', async () => {
    const response = await GET(new NextRequest('http://localhost/x'), context('impj_1'))
    expect(mocks.retrieve).toHaveBeenCalledWith('org_1', 'impj_1')
    expect(response.status).toBe(200)
  })

  it('returns 404 for an unknown job', async () => {
    mocks.retrieve.mockResolvedValue({
      data: null,
      error: { code: 'projects/import-job-not-found', message: 'Missing.' },
    })
    const response = await GET(new NextRequest('http://localhost/x'), context('impj_1'))
    expect(response.status).toBe(404)
  })
})
