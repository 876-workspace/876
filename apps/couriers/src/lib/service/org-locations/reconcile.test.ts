import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockBranchFindMany, mockWarehouseFindMany } = vi.hoisted(() => ({
  mockBranchFindMany: vi.fn(),
  mockWarehouseFindMany: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  prisma: {
    branch: { findMany: mockBranchFindMany },
    warehouse: { findMany: mockWarehouseFindMany },
  },
}))

import { listSites } from './reconcile'

const TENANT_ID = 'ten_rocketship'

// Only the row count matters to the limit arithmetic these tests cover, so the
// factory carries the identifying fields and nothing else.
function branchRow(overrides: { id: string }) {
  return {
    tenantId: TENANT_ID,
    orgLocationId: null,
    name: `Branch ${overrides.id}`,
    ...overrides,
  }
}

describe('orgLocations.listSites', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockBranchFindMany.mockResolvedValue([])
    mockWarehouseFindMany.mockResolvedValue([])
  })

  it('queries only unlinked sites for the tenant', async () => {
    await listSites(TENANT_ID)

    expect(mockBranchFindMany).toHaveBeenCalledWith({
      where: { tenantId: TENANT_ID, orgLocationId: null },
      take: 25,
      include: { address: true },
    })
    expect(mockWarehouseFindMany).toHaveBeenCalledWith({
      where: { tenantId: TENANT_ID, orgLocationId: null },
      take: 25,
      include: { address: true },
    })
  })

  it('returns empty lists when every site is already linked', async () => {
    await expect(listSites(TENANT_ID)).resolves.toEqual({
      branches: [],
      warehouses: [],
    })

    expect(mockBranchFindMany).toHaveBeenCalledTimes(1)
    expect(mockWarehouseFindMany).toHaveBeenCalledTimes(1)
  })

  it('caps the combined sweep at the reconcile limit', async () => {
    mockBranchFindMany.mockResolvedValue(
      Array.from({ length: 20 }, (_, index) => branchRow({ id: `br_${index}` }))
    )

    await listSites(TENANT_ID)

    expect(mockWarehouseFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 5 })
    )
  })

  it('does not query warehouses when branches fill the limit', async () => {
    mockBranchFindMany.mockResolvedValue(
      Array.from({ length: 25 }, (_, index) => branchRow({ id: `br_${index}` }))
    )

    await listSites(TENANT_ID)

    expect(mockWarehouseFindMany).not.toHaveBeenCalled()
  })

  it('propagates a query failure to the orchestration layer', async () => {
    const error = new Error('connection lost')
    mockBranchFindMany.mockRejectedValue(error)

    await expect(listSites(TENANT_ID)).rejects.toThrow(error)

    expect(mockWarehouseFindMany).not.toHaveBeenCalled()
  })
})
