import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGetManageContext, mockGet876Client, mockBranches } = vi.hoisted(
  () => {
    return {
      mockGetManageContext: vi.fn(),
      mockGet876Client: vi.fn(),
      mockBranches: vi.fn().mockResolvedValue({ data: { data: [] } }),
    }
  }
)

vi.mock('@/lib/auth/manage-context', () => ({
  getManageContext: mockGetManageContext,
}))

vi.mock('@/lib/876', () => ({
  get876Client: mockGet876Client,
}))
vi.mock('@/lib/couriers', () => ({
  requireCouriersData: <T>(result: { data: T }) => result.data,
  toBranchView: (branch: unknown) => branch,
}))

import { LocationsData } from './locations-data'

const TENANT_ID = 'ten_rocketship'

describe('Branches settings page data', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetManageContext.mockResolvedValue({
      tenant: { id: TENANT_ID },
      role: 'owner',
    })
    mockGet876Client.mockImplementation(() => ({
      branches: { list: mockBranches },
    }))
  })

  it('fetches branches for the tenant without scheduling a reconcile', async () => {
    await LocationsData({
      params: Promise.resolve({ orgSlug: 'island-logistics' }),
    })

    expect(mockBranches).toHaveBeenCalledWith()
  })

  it('does not fetch when there is no tenant', async () => {
    mockGetManageContext.mockResolvedValue(null)

    await LocationsData({
      params: Promise.resolve({ orgSlug: 'island-logistics' }),
    })

    expect(mockBranches).not.toHaveBeenCalled()
  })
})
