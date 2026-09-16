import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  list: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/services/projects', () => ({
  projects: { issues: { list: mocks.list } },
}))

const { POST } = await import('./route')

const match = {
  object: 'projects.issue' as const,
  id: 'iss_3',
  identifier: 'CONSOLE-3',
  title: 'Write the migration',
}

function request(body: unknown) {
  return new NextRequest('http://localhost/api/issues/search', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAccess.mockResolvedValue({
    response: null,
    orgId: 'org_1',
    userId: 'usr_1',
  })
  mocks.list.mockResolvedValue({
    data: { object: 'list', data: [match], has_more: false, url: '/issues' },
    error: null,
  })
})

describe('POST /api/issues/search', () => {
  it('requires the issue view permission', async () => {
    await POST(request({ q: 'migration' }))

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'issues',
      permission: 'issues.view',
    })
  })

  it('answers 403 and reads nothing when the caller may not view issues', async () => {
    mocks.requireAccess.mockResolvedValue({
      response: new Response(null, { status: 403 }),
    })

    const response = await POST(request({ q: 'migration' }))

    expect(response.status).toBe(403)
    expect(mocks.list).not.toHaveBeenCalled()
  })

  it('rejects a blank query before reaching the owning client', async () => {
    const response = await POST(request({ q: '   ' }))

    expect(response.status).toBe(422)
    expect(await response.json()).toEqual({
      data: null,
      error: expect.objectContaining({ message: 'Enter a search query.' }),
    })
    expect(mocks.list).not.toHaveBeenCalled()
  })

  it('returns the matches in the standard envelope', async () => {
    const response = await POST(request({ q: 'migration' }))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ data: [match], error: null })
  })

  it('asks the owning verb for one picker page of 25', async () => {
    await POST(request({ q: 'migration' }))

    expect(mocks.list).toHaveBeenCalledWith('org_1', {
      q: 'migration',
      limit: 25,
    })
  })

  it('forwards the project the picker is scoped to', async () => {
    await POST(request({ q: 'migration', projectId: 'prj_1' }))

    expect(mocks.list).toHaveBeenCalledWith('org_1', {
      q: 'migration',
      project: 'prj_1',
      limit: 25,
    })
  })

  it('reports a search the owning verb refused', async () => {
    mocks.list.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/search-unavailable',
        message: 'The search could not be run.',
      },
    })

    const response = await POST(request({ q: 'migration' }))

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      data: null,
      error: expect.objectContaining({
        message: 'The search could not be run.',
      }),
    })
  })
})
