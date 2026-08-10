import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGetManageContext, mockCouriers } = vi.hoisted(() => {
  return {
    mockGetManageContext: vi.fn(),
    mockCouriers: {
      branches: { list: vi.fn().mockResolvedValue({ data: { data: [] } }) },
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
    mockCouriers.branches.list.mockResolvedValue({ data: { data: [] } })
  })

  it('fetches branches for the tenant without scheduling a reconcile', async () => {
    await LocationsData({
      params: Promise.resolve({ orgSlug: 'island-logistics' }),
    })

    expect(mockCouriers.branches.list).toHaveBeenCalledWith(TENANT_ID)
  })

  it('does not fetch when there is no tenant', async () => {
    mockGetManageContext.mockResolvedValue(null)

    await LocationsData({
      params: Promise.resolve({ orgSlug: 'island-logistics' }),
    })

    expect(mockCouriers.branches.list).not.toHaveBeenCalled()
  })
})
