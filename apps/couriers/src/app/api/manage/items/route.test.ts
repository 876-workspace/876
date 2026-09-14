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

const body = {
  orgSlug: 'acme',
  idempotencyKey: 'item-create-001',
  type: 'GOOD',
  name: 'Parcel',
  defaultSellingAmount: '1250',
  defaultSellingCurrency: 'JMD',
}
const request = (value: unknown) =>
  new Request('http://couriers.test/api/manage/items', {
    method: 'POST',
    body: JSON.stringify(value),
  })
const context = (role = 'admin') => ({ role, orgId: 'org_1', tenant: null })

describe('Couriers item create route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getManageContext.mockResolvedValue(context())
    mocks.createBillingIntegration.mockReturnValue({
      items: { create: mocks.create },
    })
    mocks.create.mockResolvedValue({
      data: { object: 'item', id: 'item_1' },
      error: null,
    })
  })
  it('returns 403 without a Billing call for staff', async () => {
    mocks.getManageContext.mockResolvedValue(context('staff'))
    expect((await POST(request(body))).status).toBe(403)
    expect(mocks.create).not.toHaveBeenCalled()
  })
  it('returns 401 without a Billing call when signed out', async () => {
    mocks.getManageContext.mockResolvedValue(null)
    expect((await POST(request(body))).status).toBe(401)
    expect(mocks.create).not.toHaveBeenCalled()
  })
  it('returns a created envelope', async () => {
    const response = await POST(request(body))
    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({
      data: { object: 'item', id: 'item_1' },
      error: null,
    })
  })
  it('passes the item and idempotency key to Billing', async () => {
    await POST(request(body))
    expect(mocks.create).toHaveBeenCalledWith(
      'org_1',
      {
        type: 'GOOD',
        name: 'Parcel',
        defaultSellingAmount: '1250',
        defaultSellingCurrency: 'JMD',
      },
      { idempotencyKey: 'item-create-001' }
    )
  })
  it('preserves string money values without numeric conversion', async () => {
    await POST(request({ ...body, defaultSellingAmount: '0001250' }))
    expect(mocks.create.mock.calls[0]?.[1]).toMatchObject({
      defaultSellingAmount: '0001250',
    })
  })
  it('passes through registered Billing failures', async () => {
    mocks.create.mockResolvedValue({
      data: null,
      error: { code: 'billing/item-variant-not-found' },
    })
    expect((await POST(request(body))).status).toBe(404)
  })
  it('normalizes unregistered Billing failures', async () => {
    mocks.create.mockResolvedValue({
      data: null,
      error: { code: 'upstream/nope' },
    })
    expect((await POST(request(body))).status).toBe(502)
  })
  it('rejects invalid bodies before Billing', async () => {
    expect((await POST(request({ orgSlug: 'acme' }))).status).toBe(422)
    expect(mocks.create).not.toHaveBeenCalled()
  })
})
