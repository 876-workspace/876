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
        warehouses: { list: vi.fn().mockResolvedValue([]) },
        orgLocations: { reconcile: mockReconcile },
      },
    }
  })

vi.mock('next/server', () => ({ after: mockAfter }))

vi.mock('@/lib/auth/manage-context', () => ({
  getManageContext: mockGetManageContext,
}))

vi.mock('@/lib/service', () => ({ service: mockService }))

import BranchesSettingsPage from '../locations/page'
import WarehousesSettingsPage from '../warehouses/page'

const TENANT_ID = 'ten_rocketship'
const ORG_ID = 'org_rocketship'

/**
 * Both pages must schedule the repair pass. The warehouse form redirects to the
 * Warehouses page, so a warehouse whose mirror failed would stay unlinked
 * indefinitely if only the Locations page scheduled it.
 */
describe.each([
  ['Branches', BranchesSettingsPage],
  ['Warehouses', WarehousesSettingsPage],
])('%s settings page', (_name, Page) => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetManageContext.mockResolvedValue({
      tenant: { id: TENANT_ID, orgId: ORG_ID },
      role: 'owner',
    })
    mockService.branches.list.mockResolvedValue([])
    mockService.warehouses.list.mockResolvedValue([])
  })

  it('schedules the org-location reconcile after the response', async () => {
    await Page({ params: Promise.resolve({ orgSlug: 'island-logistics' }) })

    expect(mockAfter).toHaveBeenCalledTimes(1)
    expect(mockReconcile).not.toHaveBeenCalled()

    const scheduled = mockAfter.mock.calls[0]![0] as () => unknown
    scheduled()

    expect(mockReconcile).toHaveBeenCalledWith(TENANT_ID, ORG_ID)
  })

  it('does not schedule a reconcile when there is no tenant', async () => {
    mockGetManageContext.mockResolvedValue(null)

    await Page({ params: Promise.resolve({ orgSlug: 'island-logistics' }) })

    expect(mockAfter).not.toHaveBeenCalled()
  })
})
