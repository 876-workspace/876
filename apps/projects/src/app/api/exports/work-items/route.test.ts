import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  exportCsv: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/clients/integration', () => ({
  integration: { exportWorkItemsCsv: mocks.exportCsv },
}))

const { GET } = await import('./route')

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAccess.mockResolvedValue({ response: null, orgId: 'org_1', userId: 'user_1' })
  mocks.exportCsv.mockResolvedValue({ data: 'identifier,title\nISS-1,Ship\n', error: null })
})

describe('GET /api/exports/work-items', () => {
  it('requires the projects view permission', async () => {
    await GET(new NextRequest('http://localhost/x'))
    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.view',
    })
  })

  it('streams csv with a content-disposition attachment', async () => {
    const response = await GET(new NextRequest('http://localhost/x'))
    expect(mocks.exportCsv).toHaveBeenCalledWith('org_1', {})
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('text/csv')
    expect(response.headers.get('content-disposition')).toContain('attachment')
    expect(response.headers.get('content-disposition')).toContain('work-items.csv')
    expect(await response.text()).toContain('identifier,title')
  })

  it('forwards the project filter', async () => {
    await GET(new NextRequest('http://localhost/x?project=PRJ'))
    expect(mocks.exportCsv).toHaveBeenCalledWith('org_1', { project: 'PRJ' })
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
