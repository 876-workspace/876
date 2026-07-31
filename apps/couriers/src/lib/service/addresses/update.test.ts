import { beforeEach, describe, expect, it, vi } from 'vitest'

type MockPrismaClient = {
  address: {
    findFirst: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
}

const { mockPrismaRef, mockResolveRegion } = vi.hoisted(() => ({
  mockPrismaRef: { current: null as MockPrismaClient | null },
  mockResolveRegion: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  get prisma() {
    return mockPrismaRef.current
  },
}))

vi.mock('@/lib/geo/resolve-region', () => ({
  resolveRegion: mockResolveRegion,
}))

import { update } from './update'

const TENANT_ID = 'ten_rocketship'
const ADDRESS_ID = 'adr_kingston'
const NOW = 1_784_419_200

describe('addresses.update', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(NOW * 1000)

    mockPrismaRef.current = {
      address: {
        findFirst: vi.fn().mockResolvedValue({
          id: ADDRESS_ID,
          countryCode: 'JM',
          regionCode: 'JM-02',
        }),
        update: vi.fn().mockResolvedValue({ id: ADDRESS_ID }),
      },
    }
    mockResolveRegion.mockResolvedValue({
      ok: true,
      region: { regionCode: 'JM-01', regionName: 'Kingston' },
    })
  })

  it('scopes the lookup to the tenant', async () => {
    await update(TENANT_ID, ADDRESS_ID, { name: 'Renamed' })

    expect(
      mockPrismaRef.current!.address.findFirst.mock.calls[0]![0]!.where
    ).toEqual({ id: ADDRESS_ID, tenantId: TENANT_ID })
  })

  it('updates only the supplied fields', async () => {
    await update(TENANT_ID, ADDRESS_ID, { name: 'Renamed', line2: 'Floor 3' })

    expect(
      mockPrismaRef.current!.address.update.mock.calls[0]![0]!.data
    ).toEqual({
      name: 'Renamed',
      line2: 'Floor 3',
      updatedAt: NOW,
    })
  })

  it('does not consult the geo catalog when geography is unchanged', async () => {
    await update(TENANT_ID, ADDRESS_ID, { name: 'Renamed' })

    expect(mockResolveRegion).not.toHaveBeenCalled()
  })

  it('preserves a legacy region snapshot when only the street changes', async () => {
    mockPrismaRef.current!.address.findFirst.mockResolvedValue({
      id: ADDRESS_ID,
      countryCode: 'JM',
      regionCode: null,
    })

    await update(TENANT_ID, ADDRESS_ID, { line1: '2 Knutsford Boulevard' })

    const { data } = mockPrismaRef.current!.address.update.mock.calls[0]![0]!
    expect(data.regionName).toBeUndefined()
    expect(data.regionCode).toBeUndefined()
  })

  it('re-resolves geography when the region changes', async () => {
    await update(TENANT_ID, ADDRESS_ID, { regionCode: 'JM-01' })

    expect(mockResolveRegion).toHaveBeenCalledWith('JM', 'JM-01')
    const { data } = mockPrismaRef.current!.address.update.mock.calls[0]![0]!
    expect(data.regionCode).toBe('JM-01')
    expect(data.regionName).toBe('Kingston')
  })

  it('re-resolves geography when the country changes', async () => {
    mockResolveRegion.mockResolvedValue({
      ok: true,
      region: { regionCode: 'US-FL', regionName: 'Florida' },
    })

    await update(TENANT_ID, ADDRESS_ID, {
      countryCode: 'US',
      regionCode: 'US-FL',
    })

    expect(mockResolveRegion).toHaveBeenCalledWith('US', 'US-FL')
    const { data } = mockPrismaRef.current!.address.update.mock.calls[0]![0]!
    expect(data.countryCode).toBe('US')
    expect(data.regionName).toBe('Florida')
  })

  it('rejects a region that does not belong to the new country', async () => {
    mockResolveRegion.mockResolvedValue({
      ok: false,
      code: 'address/unknown-region',
    })

    const result = await update(TENANT_ID, ADDRESS_ID, {
      countryCode: 'US',
      regionCode: 'JM-02',
    })

    expect(result.code).toBe('address/unknown-region')
    expect(result.status).toBe(422)
    expect(mockPrismaRef.current!.address.update).not.toHaveBeenCalled()
  })

  it('returns not-found for another tenant’s address', async () => {
    mockPrismaRef.current!.address.findFirst.mockResolvedValue(null)

    const result = await update('ten_other', ADDRESS_ID, { name: 'Renamed' })

    expect(result.code).toBe('address/not-found')
    expect(result.status).toBe(404)
    expect(mockPrismaRef.current!.address.update).not.toHaveBeenCalled()
  })

  it('rejects a blank name without writing', async () => {
    const result = await update(TENANT_ID, ADDRESS_ID, { name: '' })

    expect(result.status).toBe(400)
    expect(mockPrismaRef.current!.address.update).not.toHaveBeenCalled()
  })

  it('returns a safe error when the write fails', async () => {
    mockPrismaRef.current!.address.update.mockRejectedValue(new Error('boom'))

    const result = await update(TENANT_ID, ADDRESS_ID, { name: 'Renamed' })

    expect(result).toEqual({
      data: null,
      error: 'Failed to update address.',
      status: 500,
    })
  })
})
