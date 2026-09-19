import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGetManageContext, mockGet876Client, mockWarehouses } = vi.hoisted(
  () => {
    return {
      mockGetManageContext: vi.fn(),
      mockGet876Client: vi.fn(),
      mockWarehouses: vi.fn().mockResolvedValue({ data: { data: [] } }),
    }
  }
)

vi.mock('@/lib/auth/manage-context', () => ({
  getManageContext: mockGetManageContext,
}))

vi.mock('@/lib/clients/couriers', () => ({
  getCouriers: mockGet876Client,
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
      role: 'super-admin',
    })
    mockGet876Client.mockImplementation(() => ({
      warehouses: { list: mockWarehouses },
    }))
  })

  it('fetches warehouses for the tenant without scheduling a reconcile', async () => {
    await WarehousesData({
      params: Promise.resolve({ orgSlug: 'island-logistics' }),
    })

    expect(mockWarehouses).toHaveBeenCalledWith()
  })

  it('does not fetch when there is no tenant', async () => {
    mockGetManageContext.mockResolvedValue(null)

    await WarehousesData({
      params: Promise.resolve({ orgSlug: 'island-logistics' }),
    })

    expect(mockWarehouses).not.toHaveBeenCalled()
  })
})
