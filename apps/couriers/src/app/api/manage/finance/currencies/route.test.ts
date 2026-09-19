import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getManageContext: vi.fn(),
  createBillingIntegration: vi.fn(),
  enable: vi.fn(),
  setDefault: vi.fn(),
}))

vi.mock('@/lib/auth/manage-context', () => ({
  getManageContext: mocks.getManageContext,
}))
vi.mock('@/lib/clients/billing', () => ({
  createBillingIntegration: mocks.createBillingIntegration,
}))

import { PATCH, POST } from './route'

function request(body: unknown, method = 'POST') {
  return new Request('http://couriers.test/api/manage/finance/currencies', {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function context(role: 'admin' | 'staff' = 'admin') {
  return {
    role,
    userId: 'usr_1',
    orgId: 'org_1',
    orgName: 'Acme',
    orgSlug: 'acme',
    orgLogoUrl: null,
    organizations: [],
    tenant: null,
    accessStatus: 'active' as const,
  }
}

describe('Couriers currency collection routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getManageContext.mockResolvedValue(context())
    mocks.createBillingIntegration.mockReturnValue({
      currencies: { enable: mocks.enable, setDefault: mocks.setDefault },
    })
    mocks.enable.mockResolvedValue({
      data: { object: 'tenant_currency', id: 'USD' },
      error: null,
    })
    mocks.setDefault.mockResolvedValue({
      data: { object: 'tenant_currency', currency: 'USD' },
      error: null,
    })
  })

  it('enables a currency through the organization finance connection', async () => {
    const response = await POST(request({ orgSlug: 'acme', currency: 'usd' }))

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({
      data: { object: 'tenant_currency', id: 'USD' },
      error: null,
    })
    expect(mocks.enable).toHaveBeenCalledTimes(1)
    expect(mocks.enable).toHaveBeenCalledWith('org_1', { currency: 'USD' })
  })

  it('sets the default currency through the organization finance connection', async () => {
    const response = await PATCH(
      request({ orgSlug: 'acme', currency: 'usd' }, 'PATCH')
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      data: { object: 'tenant_currency', currency: 'USD' },
      error: null,
    })
    expect(mocks.setDefault).toHaveBeenCalledTimes(1)
    expect(mocks.setDefault).toHaveBeenCalledWith('org_1', { currency: 'USD' })
  })

  it('rejects an invalid currency before calling Billing', async () => {
    const response = await POST(request({ orgSlug: 'acme', currency: 'US' }))

    expect(response.status).toBe(422)
    expect(await response.json()).toEqual({
      data: null,
      error: {
        code: 'finance/invalid-currency',
        message: 'The currency details are invalid.',
      },
    })
    expect(mocks.createBillingIntegration).not.toHaveBeenCalled()
    expect(mocks.enable).not.toHaveBeenCalled()
  })

  it('rejects a staff mutation before calling Billing', async () => {
    mocks.getManageContext.mockResolvedValue(context('staff'))

    const response = await POST(request({ orgSlug: 'acme', currency: 'USD' }))

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({
      data: null,
      error: {
        code: 'finance/forbidden',
        message: 'You do not have permission to manage finance settings.',
      },
    })
    expect(mocks.createBillingIntegration).not.toHaveBeenCalled()
    expect(mocks.enable).not.toHaveBeenCalled()
  })
})
