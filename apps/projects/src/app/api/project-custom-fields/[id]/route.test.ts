import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  updateField: vi.fn(),
  deleteField: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/clients/projects', () => ({
  projects: {
    projectCustomFields: {
      update: mocks.updateField,
      delete: mocks.deleteField,
    },
  },
}))

const { PATCH, DELETE } = await import('./route')

function context(id = 'field_1') {
  return { params: Promise.resolve({ id }) }
}

function patchRequest(body: unknown) {
  return new NextRequest('http://localhost/api/project-custom-fields/field_1', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function deleteRequest() {
  return new NextRequest(
    'http://localhost/api/project-custom-fields/field_1',
    { method: 'DELETE' }
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAccess.mockResolvedValue({
    response: null,
    orgId: 'org_1',
    userId: 'user_1',
  })
})

describe('PATCH /api/project-custom-fields/[id]', () => {
  it('updates a project field for editors', async () => {
    mocks.updateField.mockResolvedValue({ data: { id: 'field_1' }, error: null })
    const response = await PATCH(
      patchRequest({ label: 'Business Unit', required: true }),
      context()
    )
    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.edit',
    })
    expect(mocks.updateField).toHaveBeenCalledWith('org_1', 'field_1', {
      label: 'Business Unit',
      required: true,
    })
    expect(response.status).toBe(200)
  })

  it('rejects an empty update with 422', async () => {
    const response = await PATCH(patchRequest({}), context())
    expect(response.status).toBe(422)
    expect(mocks.updateField).not.toHaveBeenCalled()
  })

  it('returns 404 when the field does not exist', async () => {
    mocks.updateField.mockResolvedValue({
      data: null,
      error: { code: 'projects/custom-field-not-found', message: 'Missing.' },
    })
    const response = await PATCH(patchRequest({ label: 'X' }), context())
    expect(response.status).toBe(404)
  })
})

describe('DELETE /api/project-custom-fields/[id]', () => {
  it('deletes a project field for editors', async () => {
    mocks.deleteField.mockResolvedValue({ data: { deleted: true }, error: null })
    const response = await DELETE(deleteRequest(), context())
    expect(mocks.deleteField).toHaveBeenCalledWith('org_1', 'field_1')
    expect(response.status).toBe(200)
  })

  it('returns 400 when the service rejects the delete', async () => {
    mocks.deleteField.mockResolvedValue({
      data: null,
      error: { code: 'projects/unavailable', message: 'Down.' },
    })
    const response = await DELETE(deleteRequest(), context())
    expect(response.status).toBe(400)
  })
})
