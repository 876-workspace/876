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
const request = (value: unknown) =>
  new Request('http://couriers.test/api/manage/items/item_1', {
    method: 'PATCH',
    body: JSON.stringify(value),
  })
const route = { params: Promise.resolve({ id: 'item_1' }) }
describe('Couriers item update route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getManageContext.mockResolvedValue({
      role: 'admin',
      orgId: 'org_1',
      tenant: null,
    })
    mocks.createBillingIntegration.mockReturnValue({
      items: { update: mocks.update },
    })
    mocks.update.mockResolvedValue({
      data: { object: 'item', id: 'item_1' },
      error: null,
    })
  })
  it('returns an update envelope', async () => {
    const response = await PATCH(
      request({ orgSlug: 'acme', isActive: false }),
      route
    )
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      data: { object: 'item', id: 'item_1' },
      error: null,
    })
  })
  it('archives through update', async () => {
    await PATCH(request({ orgSlug: 'acme', isActive: false }), route)
    expect(mocks.update).toHaveBeenCalledWith('org_1', 'item_1', {
      isActive: false,
    })
  })
  it('restores through the same update verb', async () => {
    await PATCH(request({ orgSlug: 'acme', isActive: true }), route)
    expect(mocks.update).toHaveBeenCalledWith('org_1', 'item_1', {
      isActive: true,
    })
  })
  it('returns 403 without an update call for staff', async () => {
    mocks.getManageContext.mockResolvedValue({
      role: 'staff',
      orgId: 'org_1',
      tenant: null,
    })
    expect(
      (await PATCH(request({ orgSlug: 'acme', isActive: false }), route)).status
    ).toBe(403)
    expect(mocks.update).not.toHaveBeenCalled()
  })
  it('passes through Billing update failures', async () => {
    mocks.update.mockResolvedValue({
      data: null,
      error: { code: 'billing/item-variant-not-found' },
    })
    expect(
      (await PATCH(request({ orgSlug: 'acme', isActive: true }), route)).status
    ).toBe(404)
  })
  it('normalizes unregistered update failures', async () => {
    mocks.update.mockResolvedValue({
      data: null,
      error: { code: 'provider/down' },
    })
    expect(
      (await PATCH(request({ orgSlug: 'acme', isActive: true }), route)).status
    ).toBe(502)
  })
  it('rejects malformed updates before Billing', async () => {
    expect(
      (await PATCH(request({ orgSlug: 'acme', isActive: 'false' }), route))
        .status
    ).toBe(422)
    expect(mocks.update).not.toHaveBeenCalled()
  })
})
