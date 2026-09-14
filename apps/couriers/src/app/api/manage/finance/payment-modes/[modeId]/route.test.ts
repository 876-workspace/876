import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getManageContext: vi.fn(),
  createBillingIntegration: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}))

vi.mock('@/lib/auth/manage-context', () => ({
  getManageContext: mocks.getManageContext,
}))
vi.mock('@/lib/services/billing', () => ({
  createBillingIntegration: mocks.createBillingIntegration,
}))

import { DELETE, PATCH } from './route'

const params = Promise.resolve({ modeId: 'pm_1' })
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

function request(body: unknown, method = 'PATCH') {
  return new Request(
    'http://couriers.test/api/manage/finance/payment-modes/pm_1',
    {
      method,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }
  )
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

describe('Couriers payment mode mutation routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getManageContext.mockResolvedValue(context())
    mocks.createBillingIntegration.mockReturnValue({
      paymentModes: { update: mocks.update, delete: mocks.remove },
    })
    mocks.update.mockResolvedValue({ data: paymentMode, error: null })
    mocks.remove.mockResolvedValue({
      data: { id: 'pm_1', deleted: true },
      error: null,
    })
  })

  it('returns 403 without calling Billing when updating as staff', async () => {
    mocks.getManageContext.mockResolvedValue(context('staff'))

    const response = await PATCH(
      request({ orgSlug: 'acme', isActive: false }),
      { params }
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

  it('returns a success envelope when updating a payment mode', async () => {
    const response = await PATCH(
      request({ orgSlug: 'acme', isDefault: true }),
      { params }
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      data: paymentMode,
      error: null,
    })
    expect(mocks.update).toHaveBeenCalledWith('org_1', 'pm_1', {
      isDefault: true,
    })
  })

  it('passes a registered Billing error value through when updating', async () => {
    mocks.update.mockResolvedValue({
      data: null,
      error: { code: 'billing/workspace-not-found', message: 'internal text' },
    })

    const response = await PATCH(
      request({ orgSlug: 'acme', isActive: false }),
      { params }
    )

    expect(response.status).toBe(404)
    expect((await response.json()).error).toEqual({
      code: 'billing/workspace-not-found',
      message: 'The Billing workspace was not found.',
    })
  })

  it('returns 403 without calling Billing when deleting as staff', async () => {
    mocks.getManageContext.mockResolvedValue(context('staff'))

    const response = await DELETE(request({ orgSlug: 'acme' }, 'DELETE'), {
      params,
    })

    expect(response.status).toBe(403)
    expect(mocks.createBillingIntegration).not.toHaveBeenCalled()
    expect(mocks.remove).not.toHaveBeenCalled()
  })

  it('returns a success envelope when deleting a payment mode', async () => {
    const response = await DELETE(request({ orgSlug: 'acme' }, 'DELETE'), {
      params,
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      data: { id: 'pm_1', deleted: true },
      error: null,
    })
    expect(mocks.remove).toHaveBeenCalledWith('org_1', 'pm_1')
  })

  it('passes a registered Billing error value through when deleting', async () => {
    mocks.remove.mockResolvedValue({
      data: null,
      error: {
        code: 'finance/payment-mode-unavailable',
        message: 'internal text',
      },
    })

    const response = await DELETE(request({ orgSlug: 'acme' }, 'DELETE'), {
      params,
    })

    expect(response.status).toBe(502)
    expect((await response.json()).error).toEqual({
      code: 'finance/payment-mode-unavailable',
      message:
        'Payment mode settings are unavailable right now. Please try again.',
    })
  })
})
