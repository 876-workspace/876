import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  listFields: vi.fn(),
  createField: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/services/projects', () => ({
  projects: {
    projectCustomFields: {
      list: mocks.listFields,
      create: mocks.createField,
    },
  },
}))

const { GET, POST } = await import('./route')

function request(url: string, body?: unknown) {
  return new NextRequest(`http://localhost${url}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers:
      body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

function allowed() {
  mocks.requireAccess.mockResolvedValue({
    response: null,
    orgId: 'org_1',
    userId: 'user_1',
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  allowed()
})

describe('GET /api/project-custom-fields', () => {
  it('lists project fields for viewers', async () => {
    mocks.listFields.mockResolvedValue({ data: { object: 'list', data: [] }, error: null })
    const response = await GET()
    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.view',
    })
    expect(mocks.listFields).toHaveBeenCalledWith('org_1')
    expect(response.status).toBe(200)
  })

  it('returns 401 when unauthorized', async () => {
    mocks.requireAccess.mockResolvedValue({
      response: new Response('unauthorized', { status: 401 }),
    })
    const response = await GET()
    expect(response.status).toBe(401)
    expect(mocks.listFields).not.toHaveBeenCalled()
  })

  it('returns 400 when the service fails', async () => {
    mocks.listFields.mockResolvedValue({
      data: null,
      error: { code: 'projects/unavailable', message: 'Down.' },
    })
    const response = await GET()
    expect(response.status).toBe(400)
  })
})

describe('POST /api/project-custom-fields', () => {
  it('creates a project field for editors', async () => {
    mocks.createField.mockResolvedValue({ data: { id: 'field_1' }, error: null })
    const response = await POST(
      request('/api/project-custom-fields', {
        key: 'business-unit',
        label: 'Business unit',
        fieldType: 'text',
      })
    )
    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.edit',
    })
    expect(mocks.createField).toHaveBeenCalledWith('org_1', {
      key: 'business-unit',
      label: 'Business unit',
      fieldType: 'text',
    })
    expect(response.status).toBe(201)
  })

  it('rejects an invalid field with 422', async () => {
    const response = await POST(
      request('/api/project-custom-fields', { label: '' })
    )
    expect(response.status).toBe(422)
    expect(mocks.createField).not.toHaveBeenCalled()
  })

  it('rejects select fields without options', async () => {
    const response = await POST(
      request('/api/project-custom-fields', {
        key: 'tier',
        label: 'Tier',
        fieldType: 'select',
      })
    )
    expect(response.status).toBe(422)
    expect(mocks.createField).not.toHaveBeenCalled()
  })

  it('returns 400 when the service rejects the create', async () => {
    mocks.createField.mockResolvedValue({
      data: null,
      error: { code: 'projects/custom-field-key-taken', message: 'Taken.' },
    })
    const response = await POST(
      request('/api/project-custom-fields', {
        key: 'business-unit',
        label: 'Business unit',
        fieldType: 'text',
      })
    )
    expect(response.status).toBe(400)
  })
})
