import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AddressView } from '@/types/address'

const {
  mockAfter,
  mockBranchUpdate,
  mockCreate,
  mockList,
  mockReportServiceFailure,
  mockResolveRegionIdByCode,
  mockUpdate,
  mockWarehouseUpdate,
} = vi.hoisted(() => ({
  mockAfter: vi.fn(),
  mockBranchUpdate: vi.fn(),
  mockCreate: vi.fn(),
  mockList: vi.fn(),
  mockReportServiceFailure: vi.fn(),
  mockResolveRegionIdByCode: vi.fn(),
  mockUpdate: vi.fn(),
  mockWarehouseUpdate: vi.fn(),
}))

vi.mock('next/server', () => ({ after: mockAfter }))

vi.mock('@/lib/876/platform-client', () => ({
  getPlatformClient: async () => ({
    locations: { create: mockCreate, list: mockList, update: mockUpdate },
  }),
}))

vi.mock('@/lib/db', () => ({
  prisma: {
    branch: { update: mockBranchUpdate },
    warehouse: { update: mockWarehouseUpdate },
  },
}))

vi.mock('@/lib/geo/resolve-region', () => ({
  resolveRegionIdByCode: mockResolveRegionIdByCode,
}))

vi.mock('../report', () => ({
  reportServiceFailure: mockReportServiceFailure,
}))

import { scheduleSync, sync, type SyncSite } from './sync'

const ORG_ID = 'org_rocketship'

function address(overrides: Partial<AddressView> = {}): AddressView {
  return {
    id: 'adr_kingston',
    tenantId: 'ten_rocketship',
    name: 'Kingston branch',
    line1: '12 Hope Road',
    line2: 'Suite 3',
    city: 'Kingston',
    countryCode: 'JM',
    regionCode: 'JM-02',
    regionName: 'Saint Andrew',
    postalCode: 'JMAKN05',
    latitude: null,
    longitude: null,
    isActive: true,
    createdAt: 1_785_427_200,
    updatedAt: 1_785_427_200,
    ...overrides,
  } as AddressView
}

function site(overrides: Partial<SyncSite> = {}): SyncSite {
  return {
    kind: 'branch',
    id: 'br_kingston',
    orgLocationId: null,
    name: 'Kingston branch',
    phone: '+18765550123',
    isActive: true,
    isDefaultForKind: true,
    address: address(),
    ...overrides,
  }
}

describe('orgLocations.scheduleSync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('defers the mirror to after() instead of running it on the request path', () => {
    scheduleSync(ORG_ID, site())

    expect(mockAfter).toHaveBeenCalledTimes(1)
    expect(mockCreate).not.toHaveBeenCalled()
    expect(mockUpdate).not.toHaveBeenCalled()
  })
})

describe('orgLocations.sync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResolveRegionIdByCode.mockResolvedValue('reg_jm_sta')
    mockCreate.mockResolvedValue({ data: { id: 'loc_1' }, error: null })
    mockUpdate.mockResolvedValue({ data: { id: 'loc_1' }, error: null })
    mockList.mockResolvedValue({ data: { data: [] }, error: null })
  })

  it('creates the core location with the site id as its code', async () => {
    await sync(ORG_ID, site())

    expect(mockCreate).toHaveBeenCalledTimes(1)
    expect(mockCreate).toHaveBeenCalledWith(ORG_ID, {
      name: 'Kingston branch',
      code: 'br_kingston',
      type: 'branch',
      status: 'active',
      line1: '12 Hope Road',
      line2: 'Suite 3',
      city: 'Kingston',
      countryCode: 'JM',
      postalCode: 'JMAKN05',
      phone: '+18765550123',
      regionId: 'reg_jm_sta',
      metadata: {
        source_app: '876-couriers',
        source_id: 'br_kingston',
        is_default: true,
      },
    })
    expect(mockReportServiceFailure).not.toHaveBeenCalled()
  })

  it('persists the returned core id on the branch', async () => {
    await sync(ORG_ID, site())

    expect(mockBranchUpdate).toHaveBeenCalledTimes(1)
    expect(mockBranchUpdate).toHaveBeenCalledWith({
      where: { id: 'br_kingston' },
      data: { orgLocationId: 'loc_1' },
    })
    expect(mockWarehouseUpdate).not.toHaveBeenCalled()
  })

  it('persists the returned core id on the warehouse for a warehouse site', async () => {
    await sync(ORG_ID, site({ kind: 'warehouse', id: 'wh_miami' }))

    expect(mockWarehouseUpdate).toHaveBeenCalledWith({
      where: { id: 'wh_miami' },
      data: { orgLocationId: 'loc_1' },
    })
    expect(mockBranchUpdate).not.toHaveBeenCalled()
  })

  it('sends the inactive status for a deactivated site', async () => {
    await sync(ORG_ID, site({ isActive: false }))

    expect(mockCreate).toHaveBeenCalledWith(
      ORG_ID,
      expect.objectContaining({ status: 'inactive' })
    )
  })

  it('omits regionId entirely when the geo catalog cannot resolve it', async () => {
    mockResolveRegionIdByCode.mockResolvedValue(null)

    await sync(ORG_ID, site())

    const payload = mockCreate.mock.calls[0]![1] as Record<string, unknown>
    expect('regionId' in payload).toBe(false)
  })

  it('updates the existing core location instead of creating a second one', async () => {
    await sync(ORG_ID, site({ orgLocationId: 'loc_existing' }))

    expect(mockUpdate).toHaveBeenCalledTimes(1)
    expect(mockUpdate).toHaveBeenCalledWith(
      ORG_ID,
      'loc_existing',
      expect.objectContaining({ code: 'br_kingston' })
    )
    expect(mockCreate).not.toHaveBeenCalled()
    expect(mockBranchUpdate).not.toHaveBeenCalled()
  })

  function duplicateThenList() {
    mockCreate.mockResolvedValue({
      data: null,
      error: { code: 'location/duplicate-code', message: 'Duplicate.' },
    })
    mockList.mockResolvedValue({
      data: {
        data: [
          { id: 'loc_other', code: 'br_montego' },
          { id: 'loc_adopted', code: 'br_kingston' },
        ],
      },
      error: null,
    })
  }

  it('adopts the existing core location when the code already exists', async () => {
    duplicateThenList()

    await sync(ORG_ID, site())

    expect(mockBranchUpdate).toHaveBeenCalledWith({
      where: { id: 'br_kingston' },
      data: { orgLocationId: 'loc_adopted' },
    })
    expect(mockReportServiceFailure).not.toHaveBeenCalled()
  })

  it('applies this payload to the adopted location before linking it', async () => {
    duplicateThenList()

    await sync(ORG_ID, site({ name: 'Kingston HQ' }))

    // Without this the adopted row keeps whatever an earlier, staler mirror
    // wrote, and reconcile skips the site forever once it is linked.
    expect(mockUpdate).toHaveBeenCalledTimes(1)
    expect(mockUpdate).toHaveBeenCalledWith(
      ORG_ID,
      'loc_adopted',
      expect.objectContaining({ name: 'Kingston HQ', code: 'br_kingston' })
    )
  })

  it('leaves the site unlinked when the adopted location cannot be updated', async () => {
    duplicateThenList()
    mockUpdate.mockResolvedValue({
      data: null,
      error: { code: 'platform/unavailable', message: 'Upstream failed.' },
    })

    await sync(ORG_ID, site())

    // Linking a stale row would retire it from reconcile; staying unlinked
    // means the next pass retries.
    expect(mockBranchUpdate).not.toHaveBeenCalled()
    expect(mockReportServiceFailure).toHaveBeenCalledTimes(1)
  })

  it('reports without linking when the duplicate code is not listed for the org', async () => {
    mockCreate.mockResolvedValue({
      data: null,
      error: { code: 'location/duplicate-code', message: 'Duplicate.' },
    })

    await sync(ORG_ID, site())

    expect(mockBranchUpdate).not.toHaveBeenCalled()
    expect(mockReportServiceFailure).toHaveBeenCalledTimes(1)
    expect(mockReportServiceFailure).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        operation: 'orgLocations.sync',
        extra: { orgId: ORG_ID, siteId: 'br_kingston', siteKind: 'branch' },
      })
    )
  })

  it('reports a create failure and never throws to the caller', async () => {
    const error = { code: 'platform/unavailable', message: 'Upstream failed.' }
    mockCreate.mockResolvedValue({ data: null, error })

    await expect(sync(ORG_ID, site())).resolves.toBeUndefined()

    expect(mockBranchUpdate).not.toHaveBeenCalled()
    expect(mockReportServiceFailure).toHaveBeenCalledTimes(1)
    expect(mockReportServiceFailure).toHaveBeenCalledWith(
      error,
      expect.objectContaining({ operation: 'orgLocations.sync' })
    )
  })

  it('reports an update failure and never throws to the caller', async () => {
    const error = { code: 'platform/unavailable', message: 'Upstream failed.' }
    mockUpdate.mockResolvedValue({ data: null, error })

    await expect(
      sync(ORG_ID, site({ orgLocationId: 'loc_existing' }))
    ).resolves.toBeUndefined()

    expect(mockReportServiceFailure).toHaveBeenCalledTimes(1)
  })

  it('reports a thrown persistence failure and never throws to the caller', async () => {
    const error = new Error('connection lost')
    mockBranchUpdate.mockRejectedValue(error)

    await expect(sync(ORG_ID, site())).resolves.toBeUndefined()

    expect(mockReportServiceFailure).toHaveBeenCalledWith(
      error,
      expect.objectContaining({ operation: 'orgLocations.sync' })
    )
  })
})
