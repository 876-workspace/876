import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getManageContext: vi.fn(),
  create: vi.fn(),
}))

vi.mock('@/lib/auth/manage-context', () => ({
  getManageContext: mocks.getManageContext,
}))
vi.mock('@/lib/service', () => ({
  service: { roles: { create: mocks.create } },
}))

import { POST } from './route'

function request(body: string | Record<string, unknown>) {
  return new Request('http://couriers.test/api/manage/roles', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }) as never
}

function ctx(
  role: 'owner' | 'admin' | 'member',
  tenant: { id: string } | null = { id: 'ten_123' }
) {
  return { orgId: 'org_123', orgSlug: 'island-logistics', role, tenant }
}

const validBody = {
  orgSlug: 'island-logistics',
  name: 'Dispatcher',
  description: 'Dispatch access',
  permissions: ['packages.view'],
}

describe('Couriers roles create route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getManageContext.mockResolvedValue(ctx('owner'))
    mocks.create.mockResolvedValue({
      data: {
        id: 'role_dispatcher',
        name: 'Dispatcher',
        description: 'Dispatch access',
        permissions: ['packages.view'],
        isDefault: false,
        systemKey: null,
        memberCount: 0,
        createdAt: 1_784_419_200,
        updatedAt: 1_784_419_200,
      },
      error: null,
    })
  })

  it('rejects malformed JSON without resolving context or creating', async () => {
    const response = await POST(request('{invalid'))
    const body = await response.json()

    expect(response.status).toBe(422)
    expect(body.error.message).toBe('Invalid role.')
    expect(mocks.getManageContext).not.toHaveBeenCalled()
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('rejects a missing orgSlug without creating', async () => {
    const response = await POST(
      request({ name: 'Dispatcher', permissions: ['packages.view'] })
    )
    const body = await response.json()

    expect(response.status).toBe(422)
    expect(body.error.message).toBe('Invalid role.')
    expect(mocks.getManageContext).not.toHaveBeenCalled()
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('rejects an empty name without creating', async () => {
    const response = await POST(
      request({
        orgSlug: 'island-logistics',
        name: '   ',
        permissions: ['packages.view'],
      })
    )

    expect(response.status).toBe(422)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('rejects missing permissions without creating', async () => {
    const response = await POST(
      request({ orgSlug: 'island-logistics', name: 'Dispatcher' })
    )

    expect(response.status).toBe(422)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('returns 401 when there is no manage context', async () => {
    mocks.getManageContext.mockResolvedValue(null)

    const response = await POST(request(validBody))
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error.message).toBe('Unauthorized.')
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('forbids a plain organization member from creating roles', async () => {
    mocks.getManageContext.mockResolvedValue(ctx('member'))

    const response = await POST(request(validBody))
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body.error.code).toBe('auth/forbidden')
    expect(body.error.message).toBe(
      'You do not have permission to create roles.'
    )
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('returns 404 when the tenant has not been provisioned', async () => {
    mocks.getManageContext.mockResolvedValue(ctx('admin', null))

    const response = await POST(request(validBody))
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body.error.message).toBe('Tenant not found.')
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('creates a tenant-scoped role and returns 201 with the service payload', async () => {
    const response = await POST(request(validBody))
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body.data).toEqual({
      id: 'role_dispatcher',
      name: 'Dispatcher',
      description: 'Dispatch access',
      permissions: ['packages.view'],
      isDefault: false,
      systemKey: null,
      memberCount: 0,
      createdAt: 1_784_419_200,
      updatedAt: 1_784_419_200,
    })
    expect(body.error).toBeNull()
    expect(mocks.getManageContext).toHaveBeenCalledTimes(1)
    expect(mocks.getManageContext).toHaveBeenCalledWith('island-logistics')
    expect(mocks.create).toHaveBeenCalledTimes(1)
    expect(mocks.create).toHaveBeenCalledWith('ten_123', {
      name: 'Dispatcher',
      description: 'Dispatch access',
      permissions: ['packages.view'],
    })
  })

  it('propagates service validation failures with their status and code', async () => {
    mocks.create.mockResolvedValue({
      data: null,
      error: 'One or more permission keys are invalid.',
      status: 400,
      code: 'role/invalid-permission',
    })

    const response = await POST(request(validBody))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error.message).toBe('One or more permission keys are invalid.')
    expect(body.error.code).toBe('role/invalid-permission')
    expect(body.data).toBeNull()
  })

  it('allows an admin (not only owner) to create roles', async () => {
    mocks.getManageContext.mockResolvedValue(ctx('admin'))

    const response = await POST(request(validBody))

    expect(response.status).toBe(201)
    expect(mocks.create).toHaveBeenCalledTimes(1)
  })
})
