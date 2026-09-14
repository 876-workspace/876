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
  return new Request('http://couriers.test/api/manage/finance/payment-modes', {
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

const validBody = { orgSlug: 'acme', name: 'Bank transfer' }
const paymentMode = {
  object: 'payment_mode' as const,
  id: 'pm_1',
  name: 'Bank transfer',
  isDefault: false,
  isActive: true,
  isSystem: false,
  createdAt: 1,
  updatedAt: 1,
}

describe('Couriers payment mode create route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getManageContext.mockResolvedValue(context())
    mocks.createBillingIntegration.mockReturnValue({
      paymentModes: { create: mocks.create },
    })
    mocks.create.mockResolvedValue({ data: paymentMode, error: null })
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

  it('returns a success envelope when creating a payment mode', async () => {
    const response = await POST(request(validBody))

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({
      data: paymentMode,
      error: null,
    })
    expect(mocks.create).toHaveBeenCalledWith('org_1', {
      name: 'Bank transfer',
    })
  })

  it('passes a registered Billing error value through unchanged', async () => {
    mocks.create.mockResolvedValue({
      data: null,
      error: { code: 'billing/workspace-not-found', message: 'internal text' },
    })

    const response = await POST(request(validBody))

    expect(response.status).toBe(404)
    expect((await response.json()).error).toEqual({
      code: 'billing/workspace-not-found',
      message: 'The Billing workspace was not found.',
    })
  })
})
