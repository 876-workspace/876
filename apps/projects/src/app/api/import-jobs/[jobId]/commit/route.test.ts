import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  commit: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/services/integration', () => ({
  integration: { commitImportJob: mocks.commit },
}))

const { POST } = await import('./route')

function context(jobId: string) {
  return { params: Promise.resolve({ jobId }) }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAccess.mockResolvedValue({ response: null, orgId: 'org_1', userId: 'user_1' })
  mocks.commit.mockResolvedValue({
    data: { object: 'projects.import-job', id: 'impj_1', status: 'committed' },
    error: null,
  })
})

describe('POST /api/import-jobs/[jobId]/commit', () => {
  it('requires the projects edit permission', async () => {
    await POST(new NextRequest('http://localhost/x', { method: 'POST' }), context('impj_1'))
    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.edit',
    })
  })

  it('commits the decoded job for the organization', async () => {
    const response = await POST(
      new NextRequest('http://localhost/x', { method: 'POST' }),
      context('impj_1')
    )
    expect(mocks.commit).toHaveBeenCalledWith('org_1', 'impj_1')
    expect(response.status).toBe(200)
  })

  it('returns 400 when commit is rejected', async () => {
    mocks.commit.mockResolvedValue({
      data: null,
      error: { code: 'projects/invalid-request', message: 'Bad.' },
    })
    const response = await POST(
      new NextRequest('http://localhost/x', { method: 'POST' }),
      context('impj_1')
    )
    expect(response.status).toBe(400)
  })
})
