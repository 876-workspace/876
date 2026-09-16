import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  exportCsv: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/services/integration', () => ({
  integration: { exportTimeEntriesCsv: mocks.exportCsv },
}))

const { GET } = await import('./route')

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAccess.mockResolvedValue({ response: null, orgId: 'org_1', userId: 'user_1' })
  mocks.exportCsv.mockResolvedValue({ data: 'id,userId\nte_1,usr_1\n', error: null })
})

describe('GET /api/exports/time-entries', () => {
  it('requires the projects view permission', async () => {
    await GET(new NextRequest('http://localhost/x'))
    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.view',
    })
  })

  it('streams csv with a content-disposition attachment', async () => {
    const response = await GET(new NextRequest('http://localhost/x?projectId=prj_1'))
    expect(mocks.exportCsv).toHaveBeenCalledWith('org_1', { projectId: 'prj_1' })
    expect(response.headers.get('content-type')).toContain('text/csv')
    expect(response.headers.get('content-disposition')).toContain('time-entries.csv')
  })

  it('rejects a negative from bound with 422', async () => {
    const response = await GET(new NextRequest('http://localhost/x?from=-1'))
    expect(response.status).toBe(422)
    expect(mocks.exportCsv).not.toHaveBeenCalled()
  })

  it('returns 400 when the export fails', async () => {
    mocks.exportCsv.mockResolvedValue({
      data: null,
      error: { code: 'projects/export-unavailable', message: 'Down.' },
    })
    const response = await GET(new NextRequest('http://localhost/x'))
    expect(response.status).toBe(400)
  })
})
