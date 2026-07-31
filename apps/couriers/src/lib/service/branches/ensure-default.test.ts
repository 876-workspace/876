import { beforeEach, describe, expect, it, vi } from 'vitest'

type MockClient = {
  branch: {
    findFirst: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
  }
  address: {
    create: ReturnType<typeof vi.fn>
  }
}

const { mockPrismaRef, mockResolveRegionById } = vi.hoisted(() => ({
  mockPrismaRef: {
    current: null as (MockClient & { $transaction: unknown }) | null,
  },
  mockResolveRegionById: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  get prisma() {
    return mockPrismaRef.current
  },
}))

vi.mock('@/lib/geo/resolve-region', () => ({
  resolveRegionById: mockResolveRegionById,
  resolveRegion: vi.fn(),
}))

import {
  DEFAULT_BRANCH_NAME,
  ensureDefault,
  resolveDefaultBranchAddress,
  type ResolvedDefaultBranchAddress,
} from './ensure-default'

const TENANT_ID = 'ten_rocketship'

function createAddress(
  overrides: Partial<ResolvedDefaultBranchAddress> = {}
): ResolvedDefaultBranchAddress {
  return {
    line1: '1 Knutsford Blvd',
    line2: 'Suite 4',
    city: 'Kingston',
    countryCode: 'JM',
    regionCode: 'JM-02',
    regionName: 'Saint Andrew',
    postalCode: 'JMAKN05',
    phone: '+18765550123',
    ...overrides,
  }
}

function createMockClient(): MockClient {
  return {
    branch: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'br_main' }),
    },
    address: {
      create: vi.fn().mockResolvedValue({ id: 'adr_main' }),
    },
  }
}

describe('branches.ensureDefault', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    const client = createMockClient()
    mockPrismaRef.current = {
      ...client,
      $transaction: vi
        .fn()
        .mockImplementation((fn: (tx: MockClient) => unknown) => fn(client)),
    }
  })

  it('seeds the first branch and its address, and marks the branch default', async () => {
    const result = await ensureDefault(TENANT_ID, createAddress())

    expect(result).toBe('br_main')
    expect(mockPrismaRef.current!.address.create).toHaveBeenCalledTimes(1)
    expect(
      mockPrismaRef.current!.address.create.mock.calls[0]![0]!.data
    ).toEqual({
      tenantId: TENANT_ID,
      name: DEFAULT_BRANCH_NAME,
      line1: '1 Knutsford Blvd',
      line2: 'Suite 4',
      city: 'Kingston',
      countryCode: 'JM',
      regionCode: 'JM-02',
      regionName: 'Saint Andrew',
      postalCode: 'JMAKN05',
      isActive: true,
      createdAt: expect.any(Number),
      updatedAt: expect.any(Number),
    })
    expect(
      mockPrismaRef.current!.branch.create.mock.calls[0]![0]!.data
    ).toEqual({
      tenantId: TENANT_ID,
      addressId: 'adr_main',
      name: DEFAULT_BRANCH_NAME,
      phone: '+18765550123',
      isDefault: true,
      isActive: true,
      createdAt: expect.any(Number),
      updatedAt: expect.any(Number),
    })
  })

  it('opens a transaction when the caller supplies none', async () => {
    await ensureDefault(TENANT_ID, createAddress())

    expect(mockPrismaRef.current!.$transaction).toHaveBeenCalledTimes(1)
  })

  it('leaves an existing branch untouched and returns it', async () => {
    mockPrismaRef.current!.branch.findFirst.mockResolvedValue({
      id: 'br_existing',
    })

    const result = await ensureDefault(TENANT_ID, createAddress())

    expect(result).toBe('br_existing')
    expect(mockPrismaRef.current!.branch.create).not.toHaveBeenCalled()
    expect(mockPrismaRef.current!.address.create).not.toHaveBeenCalled()
  })

  it('defaults the country to JM when the organization has none', async () => {
    await ensureDefault(TENANT_ID, createAddress({ countryCode: null }))

    expect(
      mockPrismaRef.current!.address.create.mock.calls[0]![0]!.data.countryCode
    ).toBe('JM')
  })

  it('stores absent optional fields as null rather than empty strings', async () => {
    await ensureDefault(
      TENANT_ID,
      createAddress({ line2: '  ', postalCode: '', phone: '' })
    )

    const address =
      mockPrismaRef.current!.address.create.mock.calls[0]![0]!.data
    const branch = mockPrismaRef.current!.branch.create.mock.calls[0]![0]!.data
    expect(address.line2).toBeNull()
    expect(address.postalCode).toBeNull()
    expect(branch.phone).toBeNull()
  })

  it('keeps a null region rather than inventing one', async () => {
    await ensureDefault(
      TENANT_ID,
      createAddress({ regionCode: null, regionName: null })
    )

    const { data } = mockPrismaRef.current!.address.create.mock.calls[0]![0]!
    expect(data.regionCode).toBeNull()
    expect(data.regionName).toBeNull()
  })

  it('trims whitespace from the seeded address', async () => {
    await ensureDefault(
      TENANT_ID,
      createAddress({ line1: '  1 Knutsford Blvd  ', city: ' Kingston ' })
    )

    const { data } = mockPrismaRef.current!.address.create.mock.calls[0]![0]!
    expect(data.line1).toBe('1 Knutsford Blvd')
    expect(data.city).toBe('Kingston')
  })

  it.each([
    ['a null address', null],
    ['a missing street', createAddress({ line1: null })],
    ['a blank street', createAddress({ line1: '   ' })],
    ['a missing city', createAddress({ city: null })],
    ['a blank city', createAddress({ city: '' })],
  ])('creates no branch for %s', async (_label, address) => {
    const result = await ensureDefault(TENANT_ID, address)

    expect(result).toBeNull()
    expect(mockPrismaRef.current!.branch.create).not.toHaveBeenCalled()
    expect(mockPrismaRef.current!.address.create).not.toHaveBeenCalled()
  })

  it('returns the branch a concurrent call created instead of failing', async () => {
    const conflict = Object.assign(new Error('Unique constraint failed'), {
      code: 'P2002',
    })
    mockPrismaRef.current!.branch.create.mockRejectedValue(conflict)
    mockPrismaRef
      .current!.branch.findFirst.mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'br_raced' })

    const result = await ensureDefault(TENANT_ID, createAddress())

    expect(result).toBe('br_raced')
  })

  it('rethrows a failure that is not a unique-constraint conflict', async () => {
    mockPrismaRef.current!.branch.create.mockRejectedValue(
      new Error('connection lost')
    )

    await expect(ensureDefault(TENANT_ID, createAddress())).rejects.toThrow(
      'connection lost'
    )
  })

  it('uses the supplied transaction client instead of opening its own', async () => {
    const tx = createMockClient()
    tx.branch.create.mockResolvedValue({ id: 'br_tx' })

    const result = await ensureDefault(
      TENANT_ID,
      createAddress(),
      tx as unknown as Parameters<typeof ensureDefault>[2]
    )

    expect(result).toBe('br_tx')
    expect(tx.branch.create).toHaveBeenCalledTimes(1)
    expect(mockPrismaRef.current!.$transaction).not.toHaveBeenCalled()
    expect(mockPrismaRef.current!.branch.create).not.toHaveBeenCalled()
  })
})

describe('branches.resolveDefaultAddress', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null for a null address', async () => {
    expect(await resolveDefaultBranchAddress(null)).toBeNull()
    expect(mockResolveRegionById).not.toHaveBeenCalled()
  })

  it('resolves the core region id to a canonical code and name', async () => {
    mockResolveRegionById.mockResolvedValue({
      regionCode: 'JM-02',
      regionName: 'Saint Andrew',
    })

    const resolved = await resolveDefaultBranchAddress({
      line1: '1 Knutsford Blvd',
      city: 'Kingston',
      countryCode: 'JM',
      regionId: 'region_jm_02',
    })

    expect(mockResolveRegionById).toHaveBeenCalledWith('JM', 'region_jm_02')
    expect(resolved!.regionCode).toBe('JM-02')
    expect(resolved!.regionName).toBe('Saint Andrew')
  })

  it('drops the region rather than guessing when it cannot be resolved', async () => {
    mockResolveRegionById.mockResolvedValue(null)

    const resolved = await resolveDefaultBranchAddress({
      line1: '1 Knutsford Blvd',
      city: 'Kingston',
      regionId: 'region_unknown',
    })

    expect(resolved!.regionCode).toBeNull()
    expect(resolved!.regionName).toBeNull()
    expect(resolved!.line1).toBe('1 Knutsford Blvd')
  })

  it('does not call the catalog when the organization has no region', async () => {
    const resolved = await resolveDefaultBranchAddress({
      line1: '1 Knutsford Blvd',
      city: 'Kingston',
    })

    expect(mockResolveRegionById).not.toHaveBeenCalled()
    expect(resolved!.regionCode).toBeNull()
  })
})
