import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { DefaultBranchAddress } from '@/types/branch'

type MockPrismaClient = {
  branch: {
    findFirst: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
  }
}

const { mockPrismaRef } = vi.hoisted(() => ({
  mockPrismaRef: { current: null as MockPrismaClient | null },
}))

vi.mock('@/lib/db', () => ({
  get prisma() {
    return mockPrismaRef.current
  },
}))

import { DEFAULT_BRANCH_NAME, ensureDefault } from './ensure-default'

const TENANT_ID = 'ten_rocketship'

function createAddress(
  overrides: Partial<DefaultBranchAddress> = {}
): DefaultBranchAddress {
  return {
    street1: '1 Knutsford Blvd',
    street2: 'Suite 4',
    city: 'Kingston',
    parish: 'Saint Andrew',
    country: 'JM',
    phone: '+18765550123',
    ...overrides,
  }
}

describe('branches.ensureDefault', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrismaRef.current = {
      branch: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 'br_main' }),
      },
    }
  })

  it('seeds the first branch from the organization address and marks it default', async () => {
    const result = await ensureDefault(TENANT_ID, createAddress())

    expect(result).toBe('br_main')
    expect(mockPrismaRef.current!.branch.create).toHaveBeenCalledTimes(1)
    expect(
      mockPrismaRef.current!.branch.create.mock.calls[0]![0]!.data
    ).toEqual({
      tenantId: TENANT_ID,
      name: DEFAULT_BRANCH_NAME,
      street1: '1 Knutsford Blvd',
      street2: 'Suite 4',
      city: 'Kingston',
      parish: 'Saint Andrew',
      country: 'JM',
      phone: '+18765550123',
      isDefault: true,
      isActive: true,
      createdAt: expect.any(Number),
      updatedAt: expect.any(Number),
    })
  })

  it('leaves an existing branch untouched and returns it', async () => {
    mockPrismaRef.current!.branch.findFirst.mockResolvedValue({
      id: 'br_existing',
    })

    const result = await ensureDefault(TENANT_ID, createAddress())

    expect(result).toBe('br_existing')
    expect(mockPrismaRef.current!.branch.create).not.toHaveBeenCalled()
  })

  it('defaults the country to JM when the organization has none', async () => {
    await ensureDefault(TENANT_ID, createAddress({ country: null }))

    expect(
      mockPrismaRef.current!.branch.create.mock.calls[0]![0]!.data.country
    ).toBe('JM')
  })

  it('stores absent optional fields as null rather than empty strings', async () => {
    await ensureDefault(
      TENANT_ID,
      createAddress({ street2: '  ', parish: null, phone: '' })
    )

    const { data } = mockPrismaRef.current!.branch.create.mock.calls[0]![0]!
    expect(data.street2).toBeNull()
    expect(data.parish).toBeNull()
    expect(data.phone).toBeNull()
  })

  it('trims whitespace from the seeded address', async () => {
    await ensureDefault(
      TENANT_ID,
      createAddress({ street1: '  1 Knutsford Blvd  ', city: ' Kingston ' })
    )

    const { data } = mockPrismaRef.current!.branch.create.mock.calls[0]![0]!
    expect(data.street1).toBe('1 Knutsford Blvd')
    expect(data.city).toBe('Kingston')
  })

  it.each([
    ['a null address', null],
    ['a missing street', createAddress({ street1: null })],
    ['a blank street', createAddress({ street1: '   ' })],
    ['a missing city', createAddress({ city: null })],
    ['a blank city', createAddress({ city: '' })],
  ])('creates no branch for %s', async (_label, address) => {
    const result = await ensureDefault(TENANT_ID, address)

    expect(result).toBeNull()
    expect(mockPrismaRef.current!.branch.create).not.toHaveBeenCalled()
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

  it('uses the supplied transaction client instead of the global prisma', async () => {
    const tx = {
      branch: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 'br_tx' }),
      },
    }

    const result = await ensureDefault(
      TENANT_ID,
      createAddress(),
      tx as unknown as Parameters<typeof ensureDefault>[2]
    )

    expect(result).toBe('br_tx')
    expect(tx.branch.create).toHaveBeenCalledTimes(1)
    expect(mockPrismaRef.current!.branch.create).not.toHaveBeenCalled()
  })
})
