import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getManageContext: vi.fn(),
  createBillingIntegration: vi.fn(),
  update: vi.fn(),
}))

vi.mock('@/lib/auth/manage-context', () => ({
  getManageContext: mocks.getManageContext,
}))
vi.mock('@/lib/services/billing', () => ({
  createBillingIntegration: mocks.createBillingIntegration,
}))

import { PATCH } from './route'

const params = Promise.resolve({ taxId: 'taxr_1' })
const taxRate = {
  object: 'tax_rate' as const,
  id: 'taxr_1',
  name: 'GCT',
  description: null,
  taxType: null,
  rate: '15',
  inclusive: false,
  startsAt: null,
  isActive: true,
  isDefault: false,
  taxAuthority: {
    object: 'tax_authority' as const,
    id: 'taxa_1',
    name: 'Tax Administration Jamaica',
    description: null,
    countryCode: 'JM',
    subdivisionCode: null,
    isDefault: true,
    isActive: true,
    createdAt: 1,
    updatedAt: 1,
  },
  createdAt: 1,
  updatedAt: 1,
}

function request(body: unknown, method = 'PATCH') {
  return new Request('http://couriers.test/api/manage/finance/taxes/taxr_1', {
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

describe('Couriers tax rate update route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getManageContext.mockResolvedValue(context())
    mocks.createBillingIntegration.mockReturnValue({
      taxRates: { update: mocks.update },
    })
    mocks.update.mockResolvedValue({ data: taxRate, error: null })
  })

  it('returns 403 without calling Billing when the caller is staff', async () => {
    mocks.getManageContext.mockResolvedValue(context('staff'))

    const response = await PATCH(
      request({ orgSlug: 'acme', isActive: false }),
      {
        params,
      }
    )

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({
      data: null,
      error: {
        code: 'finance/forbidden',
        message: 'You do not have permission to manage finance settings.',
      },
    })
    expect(mocks.createBillingIntegration).not.toHaveBeenCalled()
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('returns a success envelope when updating a tax rate', async () => {
    const response = await PATCH(
      request({ orgSlug: 'acme', isDefault: true }),
      {
        params,
      }
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      data: taxRate,
      error: null,
    })
    expect(mocks.update).toHaveBeenCalledWith('org_1', 'taxr_1', {
      isDefault: true,
    })
  })

  it('passes a registered Billing error value through unchanged', async () => {
    mocks.update.mockResolvedValue({
      data: null,
      error: { code: 'billing/workspace-not-found', message: 'internal text' },
    })

    const response = await PATCH(
      request({ orgSlug: 'acme', isActive: false }),
      {
        params,
      }
    )

    expect(response.status).toBe(404)
    expect((await response.json()).error).toEqual({
      code: 'billing/workspace-not-found',
      message: 'The Billing workspace was not found.',
    })
  })
})
