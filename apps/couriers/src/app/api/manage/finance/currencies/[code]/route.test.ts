import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getManageContext: vi.fn(),
  createBillingIntegration: vi.fn(),
  update: vi.fn(),
  disable: vi.fn(),
}))

vi.mock('@/lib/auth/manage-context', () => ({
  getManageContext: mocks.getManageContext,
}))
vi.mock('@/lib/services/billing', () => ({
  createBillingIntegration: mocks.createBillingIntegration,
}))

import { DELETE, PATCH } from './route'

const route = { params: Promise.resolve({ code: 'USD' }) }

function request(body: unknown, method: 'PATCH' | 'DELETE') {
  return new Request('http://couriers.test/api/manage/finance/currencies/USD', {
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

describe('Couriers currency detail routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getManageContext.mockResolvedValue(context())
    mocks.createBillingIntegration.mockReturnValue({
      currencies: { update: mocks.update, disable: mocks.disable },
    })
    mocks.update.mockResolvedValue({
      data: { object: 'tenant_currency', currency: 'USD' },
      error: null,
    })
    mocks.disable.mockResolvedValue({
      data: { object: 'tenant_currency', currency: 'USD' },
      error: null,
    })
  })

  it('updates currency display metadata through the organization finance connection', async () => {
    const response = await PATCH(
      request(
        {
          orgSlug: 'acme',
          name: 'United States Dollar',
          symbol: '$',
          decimalPlaces: 2,
        },
        'PATCH'
      ),
      route
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      data: { object: 'tenant_currency', currency: 'USD' },
      error: null,
    })
    expect(mocks.update).toHaveBeenCalledTimes(1)
    expect(mocks.update).toHaveBeenCalledWith('org_1', 'USD', {
      name: 'United States Dollar',
      symbol: '$',
      decimalPlaces: 2,
    })
  })

  it('disables a currency through the organization finance connection', async () => {
    const response = await DELETE(request({ orgSlug: 'acme' }, 'DELETE'), route)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      data: { object: 'tenant_currency', currency: 'USD' },
      error: null,
    })
    expect(mocks.disable).toHaveBeenCalledTimes(1)
    expect(mocks.disable).toHaveBeenCalledWith('org_1', 'USD')
  })

  it('normalizes an unknown Billing failure to the registered currency error', async () => {
    mocks.disable.mockResolvedValue({
      data: null,
      error: { code: 'provider/unavailable', message: 'private provider text' },
    })

    const response = await DELETE(request({ orgSlug: 'acme' }, 'DELETE'), route)

    expect(response.status).toBe(502)
    expect(await response.json()).toEqual({
      data: null,
      error: {
        code: 'finance/currency-unavailable',
        message:
          'Currency settings are unavailable right now. Please try again.',
      },
    })
  })

  it('rejects a malformed update before calling Billing', async () => {
    const response = await PATCH(
      request({ orgSlug: 'acme', name: '', decimalPlaces: 2 }, 'PATCH'),
      route
    )

    expect(response.status).toBe(422)
    expect(await response.json()).toEqual({
      data: null,
      error: {
        code: 'finance/invalid-currency',
        message: 'The currency details are invalid.',
      },
    })
    expect(mocks.createBillingIntegration).not.toHaveBeenCalled()
    expect(mocks.update).not.toHaveBeenCalled()
  })
})
