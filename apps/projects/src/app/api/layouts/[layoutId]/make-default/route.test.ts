import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  makeDefault: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/clients/projects', () => ({
  projects: { layouts: { makeDefault: mocks.makeDefault } },
}))

const { POST } = await import('./route')

function context() {
  return { params: Promise.resolve({ layoutId: 'layout_1' }) }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAccess.mockResolvedValue({
    response: null,
    orgId: 'org_1',
    userId: 'user_1',
  })
})

describe('POST /api/layouts/[layoutId]/make-default', () => {
  it('makes the layout default for editors', async () => {
    mocks.makeDefault.mockResolvedValue({ data: { id: 'layout_1' }, error: null })
    const response = await POST(
      new NextRequest('http://localhost/api/layouts/layout_1/make-default', {
        method: 'POST',
      }),
      context()
    )
    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.edit',
    })
    expect(mocks.makeDefault).toHaveBeenCalledWith('org_1', 'layout_1')
    expect(response.status).toBe(200)
  })

  it('returns 404 for a missing layout', async () => {
    mocks.makeDefault.mockResolvedValue({
      data: null,
      error: { code: 'projects/layout-not-found', message: 'Missing.' },
    })
    const response = await POST(
      new NextRequest('http://localhost/api/layouts/layout_1/make-default', {
        method: 'POST',
      }),
      context()
    )
    expect(response.status).toBe(404)
  })
})
