import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockAfter, mockGetManageContext, mockCouriers } = vi.hoisted(() => {
  return {
    mockAfter: vi.fn(),
    mockGetManageContext: vi.fn(),
    mockCouriers: {
      warehouses: { list: vi.fn().mockResolvedValue({ data: { data: [] } }) },
      organizationLocations: { reconcile: vi.fn() },
    },
  }
})

vi.mock('next/server', () => ({ after: mockAfter }))

vi.mock('@/lib/auth/manage-context', () => ({
  getManageContext: mockGetManageContext,
}))

vi.mock('@/lib/couriers', () => ({
  $couriers: mockCouriers,
  requireCouriersData: <T>(result: { data: T }) => result.data,
  toWarehouseView: (warehouse: unknown) => warehouse,
}))

// The page shell is a sync component that renders this data child behind
// <Suspense>, so awaiting the shell never runs the fetch that schedules the
// reconcile. Target the data boundary, which is where after() is called.
import { WarehousesData } from './warehouses-data'

const TENANT_ID = 'ten_rocketship'

/**
 * The warehouse form redirects here, so a warehouse whose mirror failed would
 * stay unlinked indefinitely if only the Locations page scheduled the repair.
 */
describe('Warehouses settings page data', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetManageContext.mockResolvedValue({
      tenant: { id: TENANT_ID },
      role: 'owner',
    })
    mockCouriers.warehouses.list.mockResolvedValue({ data: { data: [] } })
  })

  it('schedules the org-location reconcile after the response', async () => {
    await WarehousesData({
      params: Promise.resolve({ orgSlug: 'island-logistics' }),
    })

    expect(mockAfter).toHaveBeenCalledTimes(1)
    expect(mockCouriers.organizationLocations.reconcile).not.toHaveBeenCalled()

    const scheduled = mockAfter.mock.calls[0]![0] as () => Promise<unknown>
    await scheduled()

    expect(mockCouriers.organizationLocations.reconcile).toHaveBeenCalledWith(
      TENANT_ID
    )
  })

  it('does not schedule a reconcile when there is no tenant', async () => {
    mockGetManageContext.mockResolvedValue(null)

    await WarehousesData({
      params: Promise.resolve({ orgSlug: 'island-logistics' }),
    })

    expect(mockAfter).not.toHaveBeenCalled()
  })
})
