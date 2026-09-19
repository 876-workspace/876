import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getManageContext: vi.fn(),
  retrieveItem: vi.fn(),
}))

vi.mock('@/lib/auth/manage-context', () => ({
  getManageContext: mocks.getManageContext,
}))
vi.mock('@/lib/clients/billing', () => ({
  billingIntegration: { items: { retrieve: mocks.retrieveItem } },
}))

import { resolveItem, resolveItemTitle } from './item-data'

const context = {
  orgId: 'org_123',
  orgName: 'Island Logistics',
  tenant: { id: 'tenant_123', name: 'Island Couriers' },
}

function createItem(overrides: Record<string, unknown> = {}) {
  return {
    object: 'item',
    id: 'item_1',
    name: 'Same-day delivery',
    sku: 'DELIVERY-SAME-DAY',
    type: 'SERVICE',
    ...overrides,
  }
}

describe('resolveItem', () => {
  beforeEach(() => {
    mocks.getManageContext.mockResolvedValue(context)
  })

  it('returns the retrieved item with no error', async () => {
    mocks.retrieveItem.mockResolvedValue({
      data: createItem(),
      error: null,
    })

    const resolved = await resolveItem('island-logistics', 'item_1')

    expect(mocks.retrieveItem).toHaveBeenCalledWith('org_123', 'item_1')
    expect(resolved?.error).toBeNull()
    expect(resolved?.item?.name).toBe('Same-day delivery')
  })

  it('returns null when the item does not exist', async () => {
    mocks.retrieveItem.mockResolvedValue({
      data: null,
      error: { code: 'item/not-found', message: 'Item not found.' },
    })

    const resolved = await resolveItem('island-logistics', 'item_missing')

    expect(resolved).toBeNull()
  })

  it('returns the error as a value instead of throwing', async () => {
    mocks.retrieveItem.mockResolvedValue({
      data: null,
      error: {
        code: 'billing/unavailable',
        message: 'The shared catalog could not be loaded.',
      },
    })

    const resolved = await resolveItem('island-logistics', 'item_1')

    expect(resolved?.item).toBeNull()
    expect(resolved?.error).toEqual({
      code: 'billing/unavailable',
      message: 'The shared catalog could not be loaded.',
    })
  })

  it('returns null without calling finance when there is no tenant', async () => {
    mocks.getManageContext.mockResolvedValue(null)

    const resolved = await resolveItem('island-logistics', 'item_1')

    expect(mocks.retrieveItem).not.toHaveBeenCalled()
    expect(resolved).toBeNull()
  })
})

describe('resolveItemTitle', () => {
  beforeEach(() => {
    mocks.getManageContext.mockResolvedValue(context)
  })

  it('returns the item name for metadata', async () => {
    mocks.retrieveItem.mockResolvedValue({
      data: createItem(),
      error: null,
    })

    await expect(resolveItemTitle('island-logistics', 'item_1')).resolves.toBe(
      'Same-day delivery'
    )
  })

  it('returns null when the item does not exist', async () => {
    mocks.retrieveItem.mockResolvedValue({
      data: null,
      error: { code: 'item/not-found', message: 'Item not found.' },
    })

    await expect(
      resolveItemTitle('island-logistics', 'item_missing')
    ).resolves.toBeNull()
  })
})
