import { beforeEach, describe, expect, it, vi } from 'vitest'

import { expectErr } from '@/test/service-result'

import type { AddressCreateParams } from '@/types/address'

type MockPrismaClient = {
  address: {
    create: ReturnType<typeof vi.fn>
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

import { create } from './create'

const TENANT_ID = 'ten_rocketship'
const NOW = 1_784_419_200

function params(
  overrides: Partial<AddressCreateParams> = {}
): AddressCreateParams {
  return {
    name: 'Kingston Main Branch',
    line1: '1 Knutsford Boulevard',
    line2: 'Suite 4',
    city: 'Kingston',
    countryCode: 'JM',
    regionCode: 'JM-02',
    postalCode: 'JMAKN05',
    ...overrides,
  }
}

describe('addresses.create', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(NOW * 1000)

    mockPrismaRef.current = {
      address: { create: vi.fn().mockResolvedValue({ id: 'adr_kingston' }) },
    }
    mockResolveRegion.mockResolvedValue({
      ok: true,
      region: { regionCode: 'JM-02', regionName: 'Saint Andrew' },
    })
  })

  it('persists a validated address with the canonical region resolved server-side', async () => {
    const result = await create(TENANT_ID, params())

    expect(result).toEqual({ data: { id: 'adr_kingston' }, error: null })
    expect(mockPrismaRef.current!.address.create).toHaveBeenCalledTimes(1)
    expect(
      mockPrismaRef.current!.address.create.mock.calls[0]![0]!.data
    ).toEqual({
      tenantId: TENANT_ID,
      name: 'Kingston Main Branch',
      line1: '1 Knutsford Boulevard',
      line2: 'Suite 4',
      city: 'Kingston',
      countryCode: 'JM',
      regionCode: 'JM-02',
      regionName: 'Saint Andrew',
      postalCode: 'JMAKN05',
      latitude: null,
      longitude: null,
      isActive: true,
      createdAt: NOW,
      updatedAt: NOW,
    })
  })

  it('uppercases the country and region codes before resolving them', async () => {
    await create(TENANT_ID, params({ countryCode: 'jm', regionCode: 'jm-02' }))

    expect(mockResolveRegion).toHaveBeenCalledWith('JM', 'JM-02')
  })

  it('stores a blank optional field as null rather than an empty string', async () => {
    await create(TENANT_ID, params({ line2: '  ', postalCode: '' }))

    const { data } = mockPrismaRef.current!.address.create.mock.calls[0]![0]!
    expect(data.line2).toBeNull()
    expect(data.postalCode).toBeNull()
  })

  it('stores no region for a country that has no subdivisions', async () => {
    mockResolveRegion.mockResolvedValue({
      ok: true,
      region: { regionCode: null, regionName: null },
    })

    await create(
      TENANT_ID,
      params({ countryCode: 'AI', regionCode: undefined })
    )

    const { data } = mockPrismaRef.current!.address.create.mock.calls[0]![0]!
    expect(data.regionCode).toBeNull()
    expect(data.regionName).toBeNull()
  })

  it('accepts a coordinate pair', async () => {
    await create(TENANT_ID, params({ latitude: 18.0179, longitude: -76.8099 }))

    const { data } = mockPrismaRef.current!.address.create.mock.calls[0]![0]!
    expect(data.latitude).toBe(18.0179)
    expect(data.longitude).toBe(-76.8099)
  })

  describe('validation', () => {
    it.each([
      ['name', { name: '' }],
      ['line1', { line1: '   ' }],
      ['city', { city: '' }],
    ])('rejects a blank %s without writing', async (_field, override) => {
      const result = await create(TENANT_ID, params(override))

      expect(result.error).toBeTruthy()
      expect(expectErr(result).status).toBe(400)
      expect(mockPrismaRef.current!.address.create).not.toHaveBeenCalled()
    })

    it('rejects a country code that is not two characters', async () => {
      const result = await create(TENANT_ID, params({ countryCode: 'JAM' }))

      expect(expectErr(result).status).toBe(400)
      expect(mockResolveRegion).not.toHaveBeenCalled()
    })

    it.each([
      ['latitude without longitude', { latitude: 18.0179 }],
      ['longitude without latitude', { longitude: -76.8099 }],
    ])('rejects %s', async (_case, override) => {
      const result = await create(TENANT_ID, params(override))

      expect(expectErr(result).status).toBe(400)
      expect(mockPrismaRef.current!.address.create).not.toHaveBeenCalled()
    })

    it.each([
      ['latitude above range', { latitude: 91, longitude: 0 }],
      ['latitude below range', { latitude: -91, longitude: 0 }],
      ['longitude above range', { latitude: 0, longitude: 181 }],
      ['longitude below range', { latitude: 0, longitude: -181 }],
    ])('rejects a %s', async (_case, override) => {
      const result = await create(TENANT_ID, params(override))

      expect(expectErr(result).status).toBe(400)
      expect(mockPrismaRef.current!.address.create).not.toHaveBeenCalled()
    })
  })

  describe('geography', () => {
    it.each([
      ['address/unknown-country', 422],
      ['address/unknown-region', 422],
      ['address/region-required', 422],
      ['address/geography-unavailable', 503],
    ] as const)('surfaces %s without writing', async (code, status) => {
      mockResolveRegion.mockResolvedValue({ ok: false, code })

      const result = await create(TENANT_ID, params())

      expect(expectErr(result).code).toBe(code)
      expect(expectErr(result).status).toBe(status)
      expect(result.data).toBeNull()
      expect(mockPrismaRef.current!.address.create).not.toHaveBeenCalled()
    })
  })

  it('returns a safe error when the write fails', async () => {
    mockPrismaRef.current!.address.create.mockRejectedValue(new Error('boom'))

    const result = await create(TENANT_ID, params())

    expect(result).toEqual({
      data: null,
      error: 'Failed to create address.',
      status: 500,
    })
  })
})
