import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getManageContext: vi.fn(),
  getPlatformClient: vi.fn(),
  retrieveRole: vi.fn(),
  createInvite: vi.fn(),
  getCouriers: vi.fn(),
  couriersErrorStatus: vi.fn(() => 502),
}))

vi.mock('@/lib/auth/manage-context', () => ({
  getManageContext: mocks.getManageContext,
}))
vi.mock('@/lib/services/platform', () => ({
  getPlatformClient: mocks.getPlatformClient,
}))
vi.mock('@/lib/services/couriers', () => ({
  getCouriers: mocks.getCouriers,
}))
vi.mock('@/lib/couriers', () => ({
  couriersErrorStatus: mocks.couriersErrorStatus,
}))
vi.mock('@/lib/couriers-app', () => ({
  COURIERS_APP_SLUG: '876-couriers',
}))

import { getError } from '@/lib/errors'
import { POST } from './route'

function request(body: string | Record<string, unknown>) {
  return new Request('http://couriers.test/api/manage/team/invites', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }) as never
}

function ctx(
  role: 'super-admin' | 'admin' | 'staff',
  tenant: { id: string } | null = { id: 'ten_123' }
) {
  return {
    orgId: 'org_123',
    orgSlug: 'island-logistics',
    role,
    tenant,
  }
}

const validBody = {
  orgSlug: 'island-logistics',
  email: 'alejandra@example.com',
  roleId: 'role_admin',
}

describe('Couriers team invite route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getCouriers.mockImplementation(() => ({
      roles: { retrieve: mocks.retrieveRole },
    }))
    mocks.getManageContext.mockResolvedValue(ctx('admin'))
    mocks.retrieveRole.mockResolvedValue({
      data: { id: 'role_admin', system_key: 'admin' },
      error: null,
    })
    mocks.getPlatformClient.mockResolvedValue({
      invites: { create: mocks.createInvite },
    })
    mocks.createInvite.mockResolvedValue({
      data: {
        id: 'invite_123',
        email: 'alejandra@example.com',
        status: 'pending',
      },
      error: null,
    })
  })

  it('rejects malformed JSON without resolving context', async () => {
    const response = await POST(request('{invalid'))
    const body = await response.json()

    expect(response.status).toBe(422)
    expect(body.error.message).toBe('Invalid invite.')
    expect(mocks.getManageContext).not.toHaveBeenCalled()
    expect(mocks.retrieveRole).not.toHaveBeenCalled()
    expect(mocks.createInvite).not.toHaveBeenCalled()
  })

  it('rejects a missing email without creating an invite', async () => {
    const response = await POST(
      request({ orgSlug: 'island-logistics', roleId: 'role_admin' })
    )

    expect(response.status).toBe(422)
    expect(mocks.createInvite).not.toHaveBeenCalled()
  })

  it('rejects an invalid email without creating an invite', async () => {
    const response = await POST(
      request({
        orgSlug: 'island-logistics',
        email: 'not-an-email',
        roleId: 'role_admin',
      })
    )

    expect(response.status).toBe(422)
    expect(mocks.createInvite).not.toHaveBeenCalled()
  })

  it('returns 401 when there is no manage context', async () => {
    mocks.getManageContext.mockResolvedValue(null)

    const response = await POST(request(validBody))
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toEqual({
      code: 'auth/no-session',
      message: getError('auth/no-session').message,
    })
    expect(mocks.retrieveRole).not.toHaveBeenCalled()
  })

  it('forbids a plain organization member from inviting', async () => {
    mocks.getManageContext.mockResolvedValue(ctx('staff'))

    const response = await POST(request(validBody))
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body.error).toEqual({
      code: 'auth/forbidden',
      message: getError('auth/forbidden').message,
    })
    expect(mocks.retrieveRole).not.toHaveBeenCalled()
    expect(mocks.createInvite).not.toHaveBeenCalled()
  })

  it('returns 404 when the tenant is missing', async () => {
    mocks.getManageContext.mockResolvedValue(ctx('admin', null))

    const response = await POST(request(validBody))
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body.error.message).toBe('Tenant not found.')
    expect(mocks.retrieveRole).not.toHaveBeenCalled()
  })

  it('returns 404 when the tenant role does not exist', async () => {
    mocks.retrieveRole.mockResolvedValue({
      data: null,
      error: { code: 'role/not-found', message: 'Not found.' },
    })

    const response = await POST(request(validBody))
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body.error.message).toBe('Role not found.')
    expect(mocks.createInvite).not.toHaveBeenCalled()
  })

  it('maps admin systemKey roles to the core admin invite role', async () => {
    const response = await POST(request(validBody))
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body.data).toEqual({
      id: 'invite_123',
      email: 'alejandra@example.com',
      status: 'pending',
    })
    expect(body.error).toBeNull()
    expect(mocks.retrieveRole).toHaveBeenCalledWith('role_admin')
    expect(mocks.createInvite).toHaveBeenCalledTimes(1)
    expect(mocks.createInvite).toHaveBeenCalledWith('org_123', {
      email: 'alejandra@example.com',
      role: 'admin',
      sourceAppSlug: '876-couriers',
    })
  })

  it('maps non-admin tenant roles to the core member invite role', async () => {
    mocks.retrieveRole.mockResolvedValue({
      data: { id: 'role_dispatcher', system_key: null },
      error: null,
    })

    const response = await POST(
      request({
        orgSlug: 'island-logistics',
        email: 'malik@example.com',
        roleId: 'role_dispatcher',
      })
    )

    expect(response.status).toBe(201)
    expect(mocks.createInvite).toHaveBeenCalledWith('org_123', {
      email: 'malik@example.com',
      role: 'staff',
      sourceAppSlug: '876-couriers',
    })
  })

  it('maps staff systemKey roles to the core member invite role', async () => {
    mocks.retrieveRole.mockResolvedValue({
      data: { id: 'role_staff', system_key: 'staff' },
      error: null,
    })

    await POST(
      request({
        orgSlug: 'island-logistics',
        email: 'staff@example.com',
        roleId: 'role_staff',
      })
    )

    expect(mocks.createInvite).toHaveBeenCalledWith('org_123', {
      email: 'staff@example.com',
      role: 'staff',
      sourceAppSlug: '876-couriers',
    })
  })

  it('propagates platform invite failures with the registered status and code', async () => {
    mocks.createInvite.mockResolvedValue({
      data: null,
      error: {
        code: 'invite/rate_limited',
        message: 'Too many invites.',
      },
    })

    const response = await POST(request(validBody))
    const body = await response.json()

    expect(response.status).toBe(429)
    expect(body.error).toEqual({
      code: 'invite/rate_limited',
      message: getError('invite/rate_limited').message,
    })
    expect(body.data).toBeNull()
  })

  it('allows an owner to invite users', async () => {
    mocks.getManageContext.mockResolvedValue(ctx('super-admin'))

    const response = await POST(request(validBody))

    expect(response.status).toBe(201)
    expect(mocks.createInvite).toHaveBeenCalledTimes(1)
  })
})
