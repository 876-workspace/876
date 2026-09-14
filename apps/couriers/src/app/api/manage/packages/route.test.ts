import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getManageContext: vi.fn(),
  create: vi.fn(),
}))

vi.mock('@/lib/auth/manage-context', () => ({
  getManageContext: mocks.getManageContext,
}))
vi.mock('@/lib/services/couriers', () => ({
  couriersOperator: { packages: { create: mocks.create } },
}))

import { getError } from '@/lib/errors'
import { POST } from './route'

function request(body: unknown) {
  return new Request('http://couriers.test/api/manage/packages', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }) as never
}

function context(overrides: Record<string, unknown> = {}) {
  return {
    role: 'admin',
    accessStatus: 'active',
    tenant: { id: 'ten_1' },
    ...overrides,
  }
}

function payload(overrides: Record<string, unknown> = {}) {
  return { orgSlug: 'island-logistics', customer_id: 'cpr_1', ...overrides }
}

function wireError(code: Parameters<typeof getError>[0]) {
  const { code: errorCode, message } = getError(code)
  return { code: errorCode, message }
}

describe('create package route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getManageContext.mockResolvedValue(context())
    mocks.create.mockResolvedValue({ data: { id: 'pkg_1' }, error: null })
  })

  it('rejects invalid JSON before resolving the manage context', async () => {
    const response = await POST(request('{invalid'))

    expect(response.status).toBe(422)
    expect(await response.json()).toEqual({
      data: null,
      error: wireError('request/invalid'),
    })
    expect(mocks.getManageContext).not.toHaveBeenCalled()
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('returns no-session without calling the operator', async () => {
    mocks.getManageContext.mockResolvedValue(null)
    const response = await POST(request(payload()))

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({
      data: null,
      error: wireError('auth/no-session'),
    })
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('forbids staff without calling the operator', async () => {
    mocks.getManageContext.mockResolvedValue(context({ role: 'staff' }))
    const response = await POST(request(payload()))

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({
      data: null,
      error: wireError('auth/forbidden'),
    })
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('rejects blocked accounts without calling the operator', async () => {
    mocks.getManageContext.mockResolvedValue(
      context({ accessStatus: 'blocked' })
    )
    const response = await POST(request(payload()))

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({
      data: null,
      error: wireError('auth/account-on-hold'),
    })
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('returns tenant not found without calling the operator', async () => {
    mocks.getManageContext.mockResolvedValue(context({ tenant: null }))
    const response = await POST(request(payload()))

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({
      data: null,
      error: wireError('tenant/not-found'),
    })
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('rejects an invalid package body without calling the operator', async () => {
    const response = await POST(request(payload({ unexpected: true })))

    expect(response.status).toBe(422)
    expect(await response.json()).toEqual({
      data: null,
      error: wireError('request/invalid'),
    })
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('propagates registered operator errors', async () => {
    mocks.create.mockResolvedValue({
      data: null,
      error: { code: 'package-category/inactive' },
    })
    const response = await POST(request(payload({ category_id: 'pcat_1' })))

    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({
      data: null,
      error: wireError('package-category/inactive'),
    })
    expect(mocks.create).toHaveBeenCalledWith('ten_1', {
      customer_id: 'cpr_1',
      category_id: 'pcat_1',
    })
  })

  it('creates a package with the exact validated body and envelope', async () => {
    const response = await POST(
      request(payload({ category_id: null, quantity: 2 }))
    )

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({
      data: { id: 'pkg_1' },
      error: null,
    })
    expect(mocks.create).toHaveBeenCalledTimes(1)
    expect(mocks.create).toHaveBeenCalledWith('ten_1', {
      customer_id: 'cpr_1',
      category_id: null,
      quantity: 2,
    })
  })
})
