import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  listRows: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/services/integration', () => ({
  integration: { listImportJobRows: mocks.listRows },
}))

const { GET } = await import('./route')

function context(jobId: string) {
  return { params: Promise.resolve({ jobId }) }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAccess.mockResolvedValue({ response: null, orgId: 'org_1', userId: 'user_1' })
  mocks.listRows.mockResolvedValue({
    data: { object: 'list', data: [], has_more: false, total_count: 0, url: '/x' },
    error: null,
  })
})

describe('GET /api/import-jobs/[jobId]/rows', () => {
  it('requires the projects view permission', async () => {
    await GET(new NextRequest('http://localhost/x'), context('impj_1'))
    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.view',
    })
  })

  it('lists rows for the decoded job', async () => {
    const response = await GET(new NextRequest('http://localhost/x'), context('impj_1'))
    expect(mocks.listRows).toHaveBeenCalledWith('org_1', 'impj_1')
    expect(response.status).toBe(200)
  })

  it('returns 404 for an unknown job', async () => {
    mocks.listRows.mockResolvedValue({
      data: null,
      error: { code: 'projects/import-job-not-found', message: 'Missing.' },
    })
    const response = await GET(new NextRequest('http://localhost/x'), context('impj_1'))
    expect(response.status).toBe(404)
  })
})
