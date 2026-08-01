import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockBranchFindMany,
  mockReportServiceFailure,
  mockSync,
  mockWarehouseFindMany,
} = vi.hoisted(() => ({
  mockBranchFindMany: vi.fn(),
  mockReportServiceFailure: vi.fn(),
  mockSync: vi.fn(),
  mockWarehouseFindMany: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  prisma: {
    branch: { findMany: mockBranchFindMany },
    warehouse: { findMany: mockWarehouseFindMany },
  },
}))

vi.mock('./sync', () => ({ sync: mockSync }))

vi.mock('../report', () => ({
  reportServiceFailure: mockReportServiceFailure,
}))

import { reconcile } from './reconcile'

const TENANT_ID = 'ten_rocketship'
const ORG_ID = 'org_rocketship'

const ADDRESS = { id: 'adr_kingston', city: 'Kingston', countryCode: 'JM' }

function branchRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'br_kingston',
    orgLocationId: null,
    name: 'Kingston branch',
    phone: '+18765550123',
    isActive: true,
    isDefault: true,
    address: ADDRESS,
    ...overrides,
  }
}

function warehouseRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'wh_miami',
    orgLocationId: null,
    name: 'Miami Receiving Hub',
    isPrimary: true,
    address: ADDRESS,
    ...overrides,
  }
}

describe('orgLocations.reconcile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockBranchFindMany.mockResolvedValue([])
    mockWarehouseFindMany.mockResolvedValue([])
    mockSync.mockResolvedValue(undefined)
  })

  it('queries only unlinked sites for the tenant', async () => {
    await reconcile(TENANT_ID, ORG_ID)

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

  it('syncs nothing when every site is already linked', async () => {
    await reconcile(TENANT_ID, ORG_ID)

    expect(mockSync).not.toHaveBeenCalled()
    expect(mockReportServiceFailure).not.toHaveBeenCalled()
  })

  it('mirrors an unlinked branch with its operational fields', async () => {
    mockBranchFindMany.mockResolvedValue([branchRow()])

    await reconcile(TENANT_ID, ORG_ID)

    expect(mockSync).toHaveBeenCalledTimes(1)
    expect(mockSync).toHaveBeenCalledWith(ORG_ID, {
      kind: 'branch',
      id: 'br_kingston',
      orgLocationId: null,
      name: 'Kingston branch',
      phone: '+18765550123',
      isActive: true,
      isDefaultForKind: true,
      address: ADDRESS,
    })
  })

  it('mirrors an unlinked warehouse as always active with no phone', async () => {
    mockWarehouseFindMany.mockResolvedValue([warehouseRow()])

    await reconcile(TENANT_ID, ORG_ID)

    expect(mockSync).toHaveBeenCalledWith(ORG_ID, {
      kind: 'warehouse',
      id: 'wh_miami',
      orgLocationId: null,
      name: 'Miami Receiving Hub',
      phone: null,
      isActive: true,
      isDefaultForKind: true,
      address: ADDRESS,
    })
  })

  it('caps the combined sweep at the reconcile limit', async () => {
    mockBranchFindMany.mockResolvedValue(
      Array.from({ length: 20 }, (_, index) => branchRow({ id: `br_${index}` }))
    )

    await reconcile(TENANT_ID, ORG_ID)

    expect(mockWarehouseFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 5 })
    )
  })

  it('does not query warehouses when branches fill the limit', async () => {
    mockBranchFindMany.mockResolvedValue(
      Array.from({ length: 25 }, (_, index) => branchRow({ id: `br_${index}` }))
    )

    await reconcile(TENANT_ID, ORG_ID)

    expect(mockWarehouseFindMany).not.toHaveBeenCalled()
    expect(mockSync).toHaveBeenCalledTimes(25)
  })

  it('reports a query failure and never throws to the page that scheduled it', async () => {
    const error = new Error('connection lost')
    mockBranchFindMany.mockRejectedValue(error)

    await expect(reconcile(TENANT_ID, ORG_ID)).resolves.toBeUndefined()

    expect(mockReportServiceFailure).toHaveBeenCalledTimes(1)
    expect(mockReportServiceFailure).toHaveBeenCalledWith(error, {
      operation: 'orgLocations.reconcile',
      consequence:
        "Couriers locations remain missing from the organization's locations in the 876 profile until the next reconcile.",
      extra: { orgId: ORG_ID, tenantId: TENANT_ID },
    })
  })
})
