import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  retrieveLayout: vi.fn(),
  updateLayout: vi.fn(),
  deleteLayout: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/services/projects', () => ({
  projects: {
    layouts: {
      retrieve: mocks.retrieveLayout,
      update: mocks.updateLayout,
      delete: mocks.deleteLayout,
    },
  },
}))

const { GET, PATCH, DELETE } = await import('./route')

const definition = {
  sections: [
    {
      key: 'section-1',
      title: 'Details',
      columns: 1,
      fields: [{ fieldKey: 'title', width: 1, visible: true }],
    },
  ],
}

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

describe('GET /api/layouts/[layoutId]', () => {
  it('retrieves a layout for viewers', async () => {
    mocks.retrieveLayout.mockResolvedValue({ data: { id: 'layout_1' }, error: null })
    const response = await GET(
      new NextRequest('http://localhost/api/layouts/layout_1'),
      context()
    )
    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.view',
    })
    expect(mocks.retrieveLayout).toHaveBeenCalledWith('org_1', 'layout_1')
    expect(response.status).toBe(200)
  })

  it('returns 404 for a missing layout', async () => {
    mocks.retrieveLayout.mockResolvedValue({
      data: null,
      error: { code: 'projects/layout-not-found', message: 'Missing.' },
    })
    const response = await GET(
      new NextRequest('http://localhost/api/layouts/layout_1'),
      context()
    )
    expect(response.status).toBe(404)
  })
})

describe('PATCH /api/layouts/[layoutId]', () => {
  it('updates a layout for editors, flattening the definition', async () => {
    mocks.updateLayout.mockResolvedValue({ data: { id: 'layout_1' }, error: null })
    const response = await PATCH(
      new NextRequest('http://localhost/api/layouts/layout_1', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Renamed', definition }),
      }),
      context()
    )
    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.edit',
    })
    expect(mocks.updateLayout).toHaveBeenCalledWith('org_1', 'layout_1', {
      name: 'Renamed',
      sections: definition.sections,
      rules: [],
    })
    expect(response.status).toBe(200)
  })

  it('rejects an empty update with 422', async () => {
    const response = await PATCH(
      new NextRequest('http://localhost/api/layouts/layout_1', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      }),
      context()
    )
    expect(response.status).toBe(422)
    expect(mocks.updateLayout).not.toHaveBeenCalled()
  })
})

describe('DELETE /api/layouts/[layoutId]', () => {
  it('deletes a layout for editors', async () => {
    mocks.deleteLayout.mockResolvedValue({ data: { deleted: true }, error: null })
    const response = await DELETE(
      new NextRequest('http://localhost/api/layouts/layout_1', {
        method: 'DELETE',
      }),
      context()
    )
    expect(mocks.deleteLayout).toHaveBeenCalledWith('org_1', 'layout_1')
    expect(response.status).toBe(200)
  })

  it('returns 404 for a missing layout', async () => {
    mocks.deleteLayout.mockResolvedValue({
      data: null,
      error: { code: 'projects/layout-not-found', message: 'Missing.' },
    })
    const response = await DELETE(
      new NextRequest('http://localhost/api/layouts/layout_1', {
        method: 'DELETE',
      }),
      context()
    )
    expect(response.status).toBe(404)
  })
})
