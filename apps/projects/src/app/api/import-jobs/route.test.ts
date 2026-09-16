import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  list: vi.fn(),
  create: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/services/integration', () => ({
  integration: {
    listImportJobs: mocks.list,
    createImportJob: mocks.create,
  },
}))

const { GET, POST } = await import('./route')

function request(method: string, body?: unknown) {
  return new NextRequest('http://localhost/api/import-jobs', {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

const job = {
  object: 'projects.import-job',
  id: 'impj_1',
  tenantId: 'prjten_1',
  source: 'csv',
  projectId: null,
  status: 'preview',
  rowCount: 2,
  successCount: 2,
  failureCount: 0,
  contentHash: 'hash',
  unmappedFields: [],
  preview: [],
  notes: [],
  createdAt: 1700000000,
  updatedAt: 1700000000,
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAccess.mockResolvedValue({ response: null, orgId: 'org_1', userId: 'user_1' })
  mocks.list.mockResolvedValue({
    data: { object: 'list', data: [job], has_more: false, total_count: 1, url: '/x' },
    error: null,
  })
  mocks.create.mockResolvedValue({ data: job, error: null })
})

describe('GET /api/import-jobs', () => {
  it('requires the projects view permission', async () => {
    await GET()
    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.view',
    })
  })

  it('lists jobs for the organization', async () => {
    const response = await GET()
    expect(mocks.list).toHaveBeenCalledWith('org_1')
    expect(response.status).toBe(200)
  })

  it('returns 400 when the service fails', async () => {
    mocks.list.mockResolvedValue({
      data: null,
      error: { code: 'projects/unavailable', message: 'Down.' },
    })
    expect((await GET()).status).toBe(400)
  })
})

describe('POST /api/import-jobs', () => {
  const input = { source: 'csv', content: 'title\nShip\n' }

  it('requires the projects edit permission', async () => {
    await POST(request('POST', input))
    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.edit',
    })
  })

  it('creates the job and answers 201', async () => {
    const response = await POST(request('POST', input))
    expect(mocks.create).toHaveBeenCalledWith('org_1', {
      source: 'csv',
      content: 'title\nShip\n',
    })
    expect(response.status).toBe(201)
  })

  it('rejects empty content with 422', async () => {
    const response = await POST(request('POST', { source: 'csv', content: '' }))
    expect(response.status).toBe(422)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('rejects an unknown source with 422', async () => {
    const response = await POST(request('POST', { source: 'excel', content: 'x' }))
    expect(response.status).toBe(422)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('rejects content above 5 MB with 422', async () => {
    const response = await POST(
      request('POST', { source: 'csv', content: `x,${'y'.repeat(5 * 1024 * 1024)}` })
    )
    expect(response.status).toBe(422)
    expect(mocks.create).not.toHaveBeenCalled()
  })
})
