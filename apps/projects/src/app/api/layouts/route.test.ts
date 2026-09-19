import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  listLayouts: vi.fn(),
  createLayout: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/clients/projects', () => ({
  projects: { layouts: { list: mocks.listLayouts, create: mocks.createLayout } },
}))

const { GET, POST } = await import('./route')

const definition = {
  sections: [
    {
      key: 'section-1',
      title: 'Details',
      columns: 1,
      fields: [{ fieldKey: 'title', width: 1, visible: true }],
    },
  ],
  rules: [],
}

function getRequest(query = '') {
  return new NextRequest(`http://localhost/api/layouts${query}`)
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAccess.mockResolvedValue({
    response: null,
    orgId: 'org_1',
    userId: 'user_1',
  })
})

describe('GET /api/layouts', () => {
  it('lists layouts for viewers', async () => {
    mocks.listLayouts.mockResolvedValue({
      data: { object: 'list', data: [] },
      error: null,
    })
    const response = await GET(getRequest('?entity=project'))
    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.view',
    })
    expect(mocks.listLayouts).toHaveBeenCalledWith('org_1', {
      entity: 'project',
    })
    expect(response.status).toBe(200)
  })

  it('rejects an unknown entity with 422', async () => {
    const response = await GET(getRequest('?entity=spaceship'))
    expect(response.status).toBe(422)
    expect(mocks.listLayouts).not.toHaveBeenCalled()
  })

  it('returns 400 when the service fails', async () => {
    mocks.listLayouts.mockResolvedValue({
      data: null,
      error: { code: 'projects/unavailable', message: 'Down.' },
    })
    const response = await GET(getRequest())
    expect(response.status).toBe(400)
  })
})

describe('POST /api/layouts', () => {
  it('creates a layout for editors, flattening the definition', async () => {
    mocks.createLayout.mockResolvedValue({ data: { id: 'layout_1' }, error: null })
    const response = await POST(
      new NextRequest('http://localhost/api/layouts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          entity: 'project',
          name: 'Default project layout',
          definition,
        }),
      })
    )
    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.edit',
    })
    expect(mocks.createLayout).toHaveBeenCalledWith('org_1', {
      entity: 'project',
      name: 'Default project layout',
      sections: definition.sections,
      rules: [],
    })
    expect(response.status).toBe(201)
  })

  it('rejects a layout without sections with 422', async () => {
    const response = await POST(
      new NextRequest('http://localhost/api/layouts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          entity: 'project',
          name: 'Empty',
          definition: { sections: [] },
        }),
      })
    )
    expect(response.status).toBe(422)
    expect(mocks.createLayout).not.toHaveBeenCalled()
  })

  it('returns 400 when the service rejects the create', async () => {
    mocks.createLayout.mockResolvedValue({
      data: null,
      error: { code: 'projects/unavailable', message: 'Down.' },
    })
    const response = await POST(
      new NextRequest('http://localhost/api/layouts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          entity: 'project',
          name: 'Default project layout',
          definition,
        }),
      })
    )
    expect(response.status).toBe(400)
  })
})
