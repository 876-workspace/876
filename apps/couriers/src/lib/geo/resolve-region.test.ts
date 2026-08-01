import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockListRegions } = vi.hoisted(() => ({ mockListRegions: vi.fn() }))

vi.mock('server-only', () => ({}))

vi.mock('@/lib/876/platform-client', () => ({
  getPlatformClient: async () => ({ regions: { list: mockListRegions } }),
}))

import { resolveRegionIdByCode } from './resolve-region'

const REGIONS = [
  { id: 'reg_jm_kgn', code: 'JM-01', name: 'Kingston' },
  { id: 'reg_jm_sta', code: 'JM-02', name: 'Saint Andrew' },
]

describe('geo.resolveRegionIdByCode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockListRegions.mockResolvedValue({ data: REGIONS, error: null })
  })

  it('returns the core region id for a known region code', async () => {
    const result = await resolveRegionIdByCode('JM', 'JM-02')

    expect(result).toBe('reg_jm_sta')
    expect(mockListRegions).toHaveBeenCalledTimes(1)
    expect(mockListRegions).toHaveBeenCalledWith('JM')
  })

  it('returns null without calling the catalog when no region code is given', async () => {
    expect(await resolveRegionIdByCode('JM', null)).toBeNull()
    expect(mockListRegions).not.toHaveBeenCalled()
  })

  it('returns null when the region code is not in the catalog', async () => {
    expect(await resolveRegionIdByCode('JM', 'JM-99')).toBeNull()
  })

  it('returns null when the catalog is unavailable', async () => {
    mockListRegions.mockResolvedValue({
      data: null,
      error: { code: 'platform/unavailable', message: 'Upstream failed.' },
    })

    expect(await resolveRegionIdByCode('JM', 'JM-02')).toBeNull()
  })

  it('does not match a region by its id', async () => {
    expect(await resolveRegionIdByCode('JM', 'reg_jm_sta')).toBeNull()
  })
})
