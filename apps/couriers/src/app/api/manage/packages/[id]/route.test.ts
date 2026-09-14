import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getManageContext: vi.fn(),
  update: vi.fn(),
}))

vi.mock('@/lib/auth/manage-context', () => ({
  getManageContext: mocks.getManageContext,
}))
vi.mock('@/lib/services/couriers', () => ({
  couriersOperator: { packages: { update: mocks.update } },
}))

import { getError } from '@/lib/errors'
import { PATCH } from './route'

function request(body: unknown) {
  return new Request('http://couriers.test/api/manage/packages/pkg_1', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }) as never
}

const params = Promise.resolve({ id: 'pkg_1' })

function context(overrides: Record<string, unknown> = {}) {
  return {
    role: 'admin',
    accessStatus: 'active',
    tenant: { id: 'ten_1' },
    ...overrides,
  }
}

function payload(overrides: Record<string, unknown> = {}) {
  return { orgSlug: 'island-logistics', status: 'ARRIVED', ...overrides }
}

function wireError(code: Parameters<typeof getError>[0]) {
  const { code: errorCode, message } = getError(code)
  return { code: errorCode, message }
}

describe('update package route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getManageContext.mockResolvedValue(context())
    mocks.update.mockResolvedValue({ data: { id: 'pkg_1' }, error: null })
  })

  it('rejects invalid JSON before resolving the manage context', async () => {
    const response = await PATCH(request('{invalid'), { params })

    expect(response.status).toBe(422)
    expect(await response.json()).toEqual({
      data: null,
      error: wireError('request/invalid'),
    })
    expect(mocks.getManageContext).not.toHaveBeenCalled()
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('returns no-session without calling the operator', async () => {
    mocks.getManageContext.mockResolvedValue(null)
    const response = await PATCH(request(payload()), { params })

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({
      data: null,
      error: wireError('auth/no-session'),
    })
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('forbids staff without calling the operator', async () => {
    mocks.getManageContext.mockResolvedValue(context({ role: 'staff' }))
    const response = await PATCH(request(payload()), { params })

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({
      data: null,
      error: wireError('auth/forbidden'),
    })
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('rejects blocked accounts without calling the operator', async () => {
    mocks.getManageContext.mockResolvedValue(
      context({ accessStatus: 'blocked' })
    )
    const response = await PATCH(request(payload()), { params })

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({
      data: null,
      error: wireError('auth/account-on-hold'),
    })
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('returns tenant not found without calling the operator', async () => {
    mocks.getManageContext.mockResolvedValue(context({ tenant: null }))
    const response = await PATCH(request(payload()), { params })

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({
      data: null,
      error: wireError('tenant/not-found'),
    })
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('rejects an invalid package body without calling the operator', async () => {
    const response = await PATCH(
      request({ orgSlug: 'island-logistics', unexpected: true }),
      { params }
    )

    expect(response.status).toBe(422)
    expect(await response.json()).toEqual({
      data: null,
      error: wireError('request/invalid'),
    })
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('propagates registered operator errors', async () => {
    mocks.update.mockResolvedValue({
      data: null,
      error: { code: 'package-category/not-found' },
    })
    const response = await PATCH(request(payload({ category_id: 'pcat_1' })), {
      params,
    })

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({
      data: null,
      error: wireError('package-category/not-found'),
    })
    expect(mocks.update).toHaveBeenCalledWith('ten_1', 'pkg_1', {
      status: 'ARRIVED',
      category_id: 'pcat_1',
    })
  })

  it('updates a package with the exact validated body and envelope', async () => {
    const response = await PATCH(
      request(payload({ category_id: null, actual_weight: null })),
      { params }
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      data: { id: 'pkg_1' },
      error: null,
    })
    expect(mocks.update).toHaveBeenCalledTimes(1)
    expect(mocks.update).toHaveBeenCalledWith('ten_1', 'pkg_1', {
      status: 'ARRIVED',
      category_id: null,
      actual_weight: null,
    })
  })
})
