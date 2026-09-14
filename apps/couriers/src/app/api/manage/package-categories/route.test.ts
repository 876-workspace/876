import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getManageContext: vi.fn(),
  create: vi.fn(),
}))

vi.mock('@/lib/auth/manage-context', () => ({
  getManageContext: mocks.getManageContext,
}))
vi.mock('@/lib/services/couriers', () => ({
  couriersOperator: { packageCategories: { create: mocks.create } },
}))

import { getError } from '@/lib/errors'
import { POST } from './route'

function post(body: string | Record<string, unknown>) {
  return new Request('http://couriers.test/api/manage/package-categories', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }) as never
}

function ctx(
  role: 'super-admin' | 'admin' | 'staff',
  tenant: { id: string } | null = { id: 'ten_123' },
  accessStatus: 'active' | 'blocked' = 'active'
) {
  return {
    orgId: 'org_123',
    orgSlug: 'island-logistics',
    role,
    tenant,
    accessStatus,
  }
}

const validBody = {
  orgSlug: 'island-logistics',
  name: 'Fragile',
  slug: 'fragile',
  description: 'Handle with care.',
  sort_order: 10,
  is_active: true,
}

const createdCategory = {
  object: 'package_category',
  id: 'pcat_fragile',
  tenant_id: 'ten_123',
  provisioning_key: null,
  name: 'Fragile',
  slug: 'fragile',
  description: 'Handle with care.',
  icon: null,
  sort_order: 10,
  is_active: true,
  created_at: 1_784_419_200,
  updated_at: 1_784_419_200,
  deleted_at: null,
}

describe('Couriers package category create route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getManageContext.mockResolvedValue(ctx('admin'))
    mocks.create.mockResolvedValue({ data: createdCategory, error: null })
  })

  it('rejects malformed JSON without resolving context or creating', async () => {
    const response = await POST(post('{invalid'))
    const body = await response.json()

    expect(response.status).toBe(422)
    expect(body).toEqual({
      data: null,
      error: {
        code: 'request/invalid',
        message: getError('request/invalid').message,
      },
    })
    expect(mocks.getManageContext).not.toHaveBeenCalled()
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('rejects a missing orgSlug without creating', async () => {
    const response = await POST(post({ name: 'Fragile', slug: 'fragile' }))

    expect(response.status).toBe(422)
    expect(mocks.getManageContext).not.toHaveBeenCalled()
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('returns 401 when there is no manage context', async () => {
    mocks.getManageContext.mockResolvedValue(null)

    const response = await POST(post(validBody))
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body).toEqual({
      data: null,
      error: {
        code: 'auth/no-session',
        message: getError('auth/no-session').message,
      },
    })
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('returns 403 without creating when the account is on hold', async () => {
    mocks.getManageContext.mockResolvedValue(
      ctx('admin', { id: 'ten_123' }, 'blocked')
    )

    const response = await POST(post(validBody))
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body).toEqual({
      data: null,
      error: {
        code: 'auth/account-on-hold',
        message: getError('auth/account-on-hold').message,
      },
    })
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('forbids staff without creating', async () => {
    mocks.getManageContext.mockResolvedValue(ctx('staff'))

    const response = await POST(post(validBody))
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body).toEqual({
      data: null,
      error: {
        code: 'auth/forbidden',
        message: getError('auth/forbidden').message,
      },
    })
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('returns 404 when the tenant has not been provisioned', async () => {
    mocks.getManageContext.mockResolvedValue(ctx('admin', null))

    const response = await POST(post(validBody))
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body).toEqual({
      data: null,
      error: {
        code: 'tenant/not-found',
        message: getError('tenant/not-found').message,
      },
    })
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('rejects an invalid body without creating', async () => {
    const response = await POST(
      post({ orgSlug: 'island-logistics', name: '   ', slug: 'fragile' })
    )
    const body = await response.json()

    expect(response.status).toBe(422)
    expect(body.error.code).toBe('request/invalid')
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('rejects a provisioning_key in the body without creating', async () => {
    const response = await POST(
      post({ ...validBody, provisioning_key: 'fragile' })
    )
    const body = await response.json()

    expect(response.status).toBe(422)
    expect(body.error.code).toBe('request/invalid')
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('propagates the operator slug-conflict code', async () => {
    mocks.create.mockResolvedValue({
      data: null,
      error: { code: 'package-category/slug-conflict' },
    })

    const response = await POST(post(validBody))
    const body = await response.json()

    expect(response.status).toBe(409)
    expect(body).toEqual({
      data: null,
      error: {
        code: 'package-category/slug-conflict',
        message: getError('package-category/slug-conflict').message,
      },
    })
  })

  it('creates a tenant-scoped category and returns the exact envelope', async () => {
    const response = await POST(post(validBody))
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body).toEqual({ data: createdCategory, error: null })
    expect(mocks.getManageContext).toHaveBeenCalledTimes(1)
    expect(mocks.getManageContext).toHaveBeenCalledWith('island-logistics')
    expect(mocks.create).toHaveBeenCalledTimes(1)
    expect(mocks.create).toHaveBeenCalledWith('ten_123', {
      name: 'Fragile',
      slug: 'fragile',
      description: 'Handle with care.',
      sort_order: 10,
      is_active: true,
    })
  })
})
