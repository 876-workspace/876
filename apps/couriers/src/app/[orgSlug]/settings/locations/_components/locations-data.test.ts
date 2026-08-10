import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockAfter, mockGetManageContext, mockCouriers } = vi.hoisted(() => {
  return {
    mockAfter: vi.fn(),
    mockGetManageContext: vi.fn(),
    mockCouriers: {
      branches: { list: vi.fn().mockResolvedValue({ data: { data: [] } }) },
      organizationLocations: { reconcile: vi.fn() },
    },
  }
})

vi.mock('next/server', () => ({ after: mockAfter }))

vi.mock('@/lib/auth/manage-context', () => ({
  getManageContext: mockGetManageContext,
}))

vi.mock('@/lib/876', () => ({
  $876: { couriers: mockCouriers },
}))
vi.mock('@/lib/couriers', () => ({
  requireCouriersData: <T>(result: { data: T }) => result.data,
  toBranchView: (branch: unknown) => branch,
}))

// The page shell is a sync component that renders this data child behind
// <Suspense>, so awaiting the shell never runs the fetch that schedules the
// reconcile. Target the data boundary, which is where after() is called.
import { LocationsData } from './locations-data'

const TENANT_ID = 'ten_rocketship'

/**
 * Repairs sites whose core mirror failed at write time. The Warehouses page
 * schedules the same pass — see warehouses-data.test.ts.
 */
describe('Branches settings page data', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetManageContext.mockResolvedValue({
      tenant: { id: TENANT_ID },
      role: 'owner',
    })
    mockCouriers.branches.list.mockResolvedValue({ data: { data: [] } })
  })

  it('schedules the org-location reconcile after the response', async () => {
    await LocationsData({
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

    await LocationsData({
      params: Promise.resolve({ orgSlug: 'island-logistics' }),
    })

    expect(mockAfter).not.toHaveBeenCalled()
  })
})
