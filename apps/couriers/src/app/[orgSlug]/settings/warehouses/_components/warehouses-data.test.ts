import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGetManageContext, mockCouriers } = vi.hoisted(() => {
  return {
    mockGetManageContext: vi.fn(),
    mockCouriers: {
      warehouses: { list: vi.fn().mockResolvedValue({ data: { data: [] } }) },
    },
  }
})

vi.mock('@/lib/auth/manage-context', () => ({
  getManageContext: mockGetManageContext,
}))

vi.mock('@/lib/876', () => ({
  $876: { couriers: mockCouriers },
}))
vi.mock('@/lib/couriers', () => ({
  requireCouriersData: <T>(result: { data: T }) => result.data,
  toWarehouseView: (warehouse: unknown) => warehouse,
}))

import { WarehousesData } from './warehouses-data'

const TENANT_ID = 'ten_rocketship'

describe('Warehouses settings page data', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetManageContext.mockResolvedValue({
      tenant: { id: TENANT_ID },
      role: 'owner',
    })
    mockCouriers.warehouses.list.mockResolvedValue({ data: { data: [] } })
  })

  it('fetches warehouses for the tenant without scheduling a reconcile', async () => {
    await WarehousesData({
      params: Promise.resolve({ orgSlug: 'island-logistics' }),
    })

    expect(mockCouriers.warehouses.list).toHaveBeenCalledWith(TENANT_ID)
  })

  it('does not fetch when there is no tenant', async () => {
    mockGetManageContext.mockResolvedValue(null)

    await WarehousesData({
      params: Promise.resolve({ orgSlug: 'island-logistics' }),
    })

    expect(mockCouriers.warehouses.list).not.toHaveBeenCalled()
  })
})
