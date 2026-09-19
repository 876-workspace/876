import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getManageContext: vi.fn(),
  createBillingIntegration: vi.fn(),
  update: vi.fn(),
}))

vi.mock('@/lib/auth/manage-context', () => ({
  getManageContext: mocks.getManageContext,
}))
vi.mock('@/lib/clients/billing', () => ({
  createBillingIntegration: mocks.createBillingIntegration,
}))

import { PATCH } from './route'

function request(body: unknown) {
  return new Request('http://couriers.test/api/manage/finance/branding', {
    method: 'PATCH',
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

const branding = {
  object: 'branding' as const,
  accentColor: '#e11d48',
  appearance: 'dark' as const,
  sidebarTone: 'light' as const,
  updatedAt: 1,
}

describe('Couriers branding route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getManageContext.mockResolvedValue(context())
    mocks.createBillingIntegration.mockReturnValue({
      branding: { update: mocks.update },
    })
    mocks.update.mockResolvedValue({ data: branding, error: null })
  })

  it('returns 403 without calling Billing when the caller is staff', async () => {
    mocks.getManageContext.mockResolvedValue(context('staff'))

    const response = await PATCH(
      request({ orgSlug: 'acme', appearance: 'dark' })
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

  it('returns a success envelope when updating branding', async () => {
    const response = await PATCH(
      request({ orgSlug: 'acme', accentColor: '#e11d48', appearance: 'dark' })
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ data: branding, error: null })
    expect(mocks.update).toHaveBeenCalledWith('org_1', {
      accentColor: '#e11d48',
      appearance: 'dark',
    })
  })

  it('returns 422 when the accent color is not a hex color', async () => {
    const response = await PATCH(
      request({ orgSlug: 'acme', accentColor: 'rose' })
    )

    expect(response.status).toBe(422)
    expect((await response.json()).error.code).toBe('finance/invalid-branding')
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('normalizes an unrecognized Billing failure to the branding error', async () => {
    mocks.update.mockResolvedValue({
      data: null,
      error: { code: 'provider/weird', message: 'internal text' },
    })

    const response = await PATCH(
      request({ orgSlug: 'acme', appearance: 'dark' })
    )

    expect(response.status).toBe(502)
    expect((await response.json()).error.code).toBe(
      'finance/branding-unavailable'
    )
  })
})
