import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  listValues: vi.fn(),
  setValues: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/services/projects', () => ({
  projects: {
    projectCustomFields: {
      values: { list: mocks.listValues, set: mocks.setValues },
    },
  },
}))

const { GET, PUT } = await import('./route')

function context() {
  return { params: Promise.resolve({ projectId: 'project_1' }) }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAccess.mockResolvedValue({
    response: null,
    orgId: 'org_1',
    userId: 'user_1',
  })
})

describe('GET custom-field-values', () => {
  it('lists values for viewers', async () => {
    mocks.listValues.mockResolvedValue({
      data: { object: 'list', data: [] },
      error: null,
    })
    const response = await GET(
      new NextRequest('http://localhost/api/projects/project_1/custom-field-values'),
      context()
    )
    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.view',
    })
    expect(mocks.listValues).toHaveBeenCalledWith('org_1', 'project_1')
    expect(response.status).toBe(200)
  })

  it('returns 400 when the service fails', async () => {
    mocks.listValues.mockResolvedValue({
      data: null,
      error: { code: 'projects/unavailable', message: 'Down.' },
    })
    const response = await GET(
      new NextRequest('http://localhost/api/projects/project_1/custom-field-values'),
      context()
    )
    expect(response.status).toBe(400)
  })
})

describe('PUT custom-field-values', () => {
  it('saves values for editors with the acting user', async () => {
    mocks.setValues.mockResolvedValue({
      data: { object: 'list', data: [] },
      error: null,
    })
    const response = await PUT(
      new NextRequest(
        'http://localhost/api/projects/project_1/custom-field-values',
        {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            customFields: [{ fieldId: 'field_1', value: 'Retail' }],
          }),
        }
      ),
      context()
    )
    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.edit',
    })
    expect(mocks.setValues).toHaveBeenCalledWith('org_1', 'project_1', {
      customFields: [{ fieldId: 'field_1', value: 'Retail' }],
      updatedBy: 'user_1',
    })
    expect(response.status).toBe(200)
  })

  it('rejects unnamed fields with 422', async () => {
    const response = await PUT(
      new NextRequest(
        'http://localhost/api/projects/project_1/custom-field-values',
        {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ customFields: [{ value: 'Retail' }] }),
        }
      ),
      context()
    )
    expect(response.status).toBe(422)
    expect(mocks.setValues).not.toHaveBeenCalled()
  })

  it('returns 400 when the service rejects the values', async () => {
    mocks.setValues.mockResolvedValue({
      data: null,
      error: { code: 'projects/custom-field-value-invalid', message: 'Bad.' },
    })
    const response = await PUT(
      new NextRequest(
        'http://localhost/api/projects/project_1/custom-field-values',
        {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            customFields: [{ fieldId: 'field_1', value: 'Retail' }],
          }),
        }
      ),
      context()
    )
    expect(response.status).toBe(400)
  })
})
