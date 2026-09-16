import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  resolveKeys: vi.fn(),
  listModules: vi.fn(),
  createModule: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/custom-modules/api-access', () => ({
  resolveCallerRoleKeys: mocks.resolveKeys,
  serviceErrorStatus: (code: string) => (code.includes('not-found') ? 404 : 400),
}))
vi.mock('@/lib/custom-modules/service-with-roles', () => ({
  serviceWithRoleKeys: (roleKeys: string[]) => ({
    customModules: {
      listModules: (orgId: string) => mocks.listModules(orgId, roleKeys),
      createModule: (orgId: string, input: unknown) => mocks.createModule(orgId, input),
    },
  }),
}))

const { GET, POST } = await import('./route')

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAccess.mockResolvedValue({ response: null, orgId: 'org_1', userId: 'user_1' })
  mocks.resolveKeys.mockResolvedValue(['projects.view'])
})

describe('GET /api/custom-modules', () => {
  it('lists modules with role keys from the access context', async () => {
    mocks.listModules.mockResolvedValue({ data: { object: 'list', data: [] }, error: null })
    const response = await GET()
    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.view',
    })
    expect(mocks.resolveKeys).toHaveBeenCalledWith('user_1', 'org_1')
    expect(mocks.listModules).toHaveBeenCalledWith('org_1', ['projects.view'])
    expect(response.status).toBe(200)
  })

  it('returns 400 when the service fails', async () => {
    mocks.listModules.mockResolvedValue({
      data: null,
      error: { code: 'projects/unavailable', message: 'Down.' },
    })
    const response = await GET()
    expect(response.status).toBe(400)
  })
})

describe('POST /api/custom-modules', () => {
  it('creates a module for editors', async () => {
    mocks.createModule.mockResolvedValue({ data: { id: 'cmod_1' }, error: null })
    const response = await POST(
      new NextRequest('http://localhost/api/custom-modules', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          scope: 'org',
          key: 'risks',
          singularName: 'Risk',
          pluralName: 'Risks',
        }),
      })
    )
    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.edit',
    })
    expect(mocks.createModule).toHaveBeenCalledWith(
      'org_1',
      expect.objectContaining({ key: 'risks' })
    )
    expect(response.status).toBe(201)
  })

  it('rejects a module without names with 422', async () => {
    const response = await POST(
      new NextRequest('http://localhost/api/custom-modules', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ scope: 'org', key: 'risks' }),
      })
    )
    expect(response.status).toBe(422)
    expect(mocks.createModule).not.toHaveBeenCalled()
  })

  it('rejects a module key outside kebab-case with 422', async () => {
    const response = await POST(
      new NextRequest('http://localhost/api/custom-modules', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          scope: 'org',
          key: 'Risk Log',
          singularName: 'Risk',
          pluralName: 'Risks',
        }),
      })
    )
    expect(response.status).toBe(422)
    expect(mocks.createModule).not.toHaveBeenCalled()
  })

  it('never reads role keys from the request body', async () => {
    mocks.createModule.mockResolvedValue({ data: { id: 'cmod_1' }, error: null })
    const response = await POST(
      new NextRequest('http://localhost/api/custom-modules', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          scope: 'org',
          key: 'risks',
          singularName: 'Risk',
          pluralName: 'Risks',
          callerRoleKeys: ['super-admin'],
        }),
      })
    )
    expect(response.status).toBe(422)
    expect(mocks.createModule).not.toHaveBeenCalled()
  })
})
