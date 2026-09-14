import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getManageContext: vi.fn(),
  createBillingIntegration: vi.fn(),
  create: vi.fn(),
}))

vi.mock('@/lib/auth/manage-context', () => ({
  getManageContext: mocks.getManageContext,
}))
vi.mock('@/lib/services/billing', () => ({
  createBillingIntegration: mocks.createBillingIntegration,
}))

import { POST } from './route'

function request(body: unknown) {
  return new Request('http://couriers.test/api/manage/finance/taxes', {
    method: 'POST',
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

const validBody = {
  orgSlug: 'acme',
  name: 'GCT',
  rate: '15',
  taxAuthorityId: 'taxa_1',
}

describe('Couriers tax rate create route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getManageContext.mockResolvedValue(context())
    mocks.createBillingIntegration.mockReturnValue({
      taxRates: { create: mocks.create },
    })
    mocks.create.mockResolvedValue({ data: { id: 'taxr_1' }, error: null })
  })

  it('returns 403 without calling Billing when the caller is staff', async () => {
    mocks.getManageContext.mockResolvedValue(context('staff'))

    const response = await POST(request(validBody))

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({
      data: null,
      error: {
        code: 'finance/forbidden',
        message: 'You do not have permission to manage finance settings.',
      },
    })
    expect(mocks.createBillingIntegration).not.toHaveBeenCalled()
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('returns a success envelope when creating a tax rate', async () => {
    const response = await POST(request(validBody))

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({
      data: { id: 'taxr_1' },
      error: null,
    })
    expect(mocks.create).toHaveBeenCalledWith('org_1', {
      name: 'GCT',
      rate: '15',
      taxAuthorityId: 'taxa_1',
    })
  })

  it('passes a registered Billing error value through unchanged', async () => {
    mocks.create.mockResolvedValue({
      data: null,
      error: { code: 'billing/workspace-not-found', message: 'internal text' },
    })

    const response = await POST(request(validBody))

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({
      data: null,
      error: {
        code: 'billing/workspace-not-found',
        message: 'The Billing workspace was not found.',
      },
    })
  })

  it('normalizes an unrecognized Billing failure to the registered tax error', async () => {
    mocks.create.mockResolvedValue({
      data: null,
      error: { code: 'provider/weird', message: 'internal text' },
    })

    const response = await POST(request(validBody))

    expect(response.status).toBe(502)
    expect((await response.json()).error.code).toBe('finance/tax-unavailable')
  })
})
