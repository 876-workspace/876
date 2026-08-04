import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockAfter, mockReconcile, mockGetManageContext, mockService } =
  vi.hoisted(() => {
    const mockReconcile = vi.fn()
    return {
      mockAfter: vi.fn(),
      mockReconcile,
      mockGetManageContext: vi.fn(),
      mockService: {
        branches: { list: vi.fn().mockResolvedValue([]) },
        orgLocations: { reconcile: mockReconcile },
      },
    }
  })

vi.mock('next/server', () => ({ after: mockAfter }))

vi.mock('@/lib/auth/manage-context', () => ({
  getManageContext: mockGetManageContext,
}))

vi.mock('@/lib/service', () => ({ service: mockService }))

// The page shell is a sync component that renders this data child behind
// <Suspense>, so awaiting the shell never runs the fetch that schedules the
// reconcile. Target the data boundary, which is where after() is called.
import { LocationsData } from './locations-data'

const TENANT_ID = 'ten_rocketship'
const ORG_ID = 'org_rocketship'

/**
 * Repairs sites whose core mirror failed at write time. The Warehouses page
 * schedules the same pass — see warehouses-data.test.ts.
 */
describe('Branches settings page data', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetManageContext.mockResolvedValue({
      tenant: { id: TENANT_ID, orgId: ORG_ID },
      role: 'owner',
    })
    mockService.branches.list.mockResolvedValue([])
  })

  it('schedules the org-location reconcile after the response', async () => {
    await LocationsData({
      params: Promise.resolve({ orgSlug: 'island-logistics' }),
    })

    expect(mockAfter).toHaveBeenCalledTimes(1)
    expect(mockReconcile).not.toHaveBeenCalled()

    const scheduled = mockAfter.mock.calls[0]![0] as () => unknown
    scheduled()

    expect(mockReconcile).toHaveBeenCalledWith(TENANT_ID, ORG_ID)
  })

  it('does not schedule a reconcile when there is no tenant', async () => {
    mockGetManageContext.mockResolvedValue(null)

    await LocationsData({
      params: Promise.resolve({ orgSlug: 'island-logistics' }),
    })

    expect(mockAfter).not.toHaveBeenCalled()
  })
})
