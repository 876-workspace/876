import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  resolveLayout: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/clients/projects', () => ({
  projects: { layouts: { resolve: mocks.resolveLayout } },
}))

const { GET } = await import('./route')

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAccess.mockResolvedValue({
    response: null,
    orgId: 'org_1',
    userId: 'user_1',
  })
})

describe('GET /api/layouts/resolve', () => {
  it('resolves the entity default for viewers', async () => {
    mocks.resolveLayout.mockResolvedValue({
      data: { id: null, entity: 'project', builtIn: true },
      error: null,
    })
    const response = await GET(
      new NextRequest('http://localhost/api/layouts/resolve?entity=project')
    )
    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.view',
    })
    expect(mocks.resolveLayout).toHaveBeenCalledWith('org_1', {
      entity: 'project',
    })
    expect(response.status).toBe(200)
  })

  it('resolves a work-item type layout', async () => {
    mocks.resolveLayout.mockResolvedValue({ data: { id: 'layout_1' }, error: null })
    const response = await GET(
      new NextRequest(
        'http://localhost/api/layouts/resolve?entity=work-item&workItemTypeId=type_1'
      )
    )
    expect(mocks.resolveLayout).toHaveBeenCalledWith('org_1', {
      entity: 'work-item',
      workItemTypeId: 'type_1',
    })
    expect(response.status).toBe(200)
  })

  it('requires an entity with 422', async () => {
    const response = await GET(
      new NextRequest('http://localhost/api/layouts/resolve')
    )
    expect(response.status).toBe(422)
    expect(mocks.resolveLayout).not.toHaveBeenCalled()
  })

  it('returns 400 when the service fails', async () => {
    mocks.resolveLayout.mockResolvedValue({
      data: null,
      error: { code: 'projects/unavailable', message: 'Down.' },
    })
    const response = await GET(
      new NextRequest('http://localhost/api/layouts/resolve?entity=phase')
    )
    expect(response.status).toBe(400)
  })
})
