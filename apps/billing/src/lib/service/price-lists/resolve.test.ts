import { beforeEach, describe, expect, it, vi } from 'vitest'

import { resolveAmount } from './resolve'

const { prismaRef } = vi.hoisted(() => ({
  prismaRef: { current: null as unknown as Record<string, unknown> },
}))

vi.mock('@/lib/db', () => ({
  get prisma() {
    return prismaRef.current
  },
}))

function price(overrides: Record<string, unknown> = {}) {
  return {
    id: 'prc_1',
    currency: 'JMD',
    pricingModel: 'PER_UNIT',
    unitAmount: 1_000n,
    packageSize: null,
    tiers: [],
    ...overrides,
  }
}

describe('price list resolution', () => {
  beforeEach(() => {
    prismaRef.current = {
      price: { findFirst: vi.fn().mockResolvedValue(price()) },
      priceList: { findFirst: vi.fn().mockResolvedValue(null) },
    }
    vi.clearAllMocks()
  })

  it('returns the immutable base price without a price list', async () => {
    const result = await resolveAmount('ten_1', 'prc_1', 3)

    expect(result).toEqual({
      currency: 'JMD',
      amount: 3_000n,
      priceList: null,
    })
  })

  it('applies percentage adjustments to the calculated catalog total', async () => {
    const prisma = prismaRef.current as {
      priceList: { findFirst: ReturnType<typeof vi.fn> }
    }
    const list = {
      id: 'plist_1',
      mode: 'PERCENTAGE',
      direction: 'MARKDOWN',
      percentage: 15,
      rounding: 'NONE',
      roundingPrecision: 2,
      currency: null,
      entries: [],
    }
    prisma.priceList.findFirst.mockResolvedValue(list)

    const result = await resolveAmount('ten_1', 'prc_1', 2, 'plist_1')

    expect(result).toEqual({
      currency: 'JMD',
      amount: 1_700n,
      priceList: list,
    })
  })

  it('uses custom volume rates in the price-list currency', async () => {
    const prisma = prismaRef.current as {
      priceList: { findFirst: ReturnType<typeof vi.fn> }
    }
    const list = {
      id: 'plist_1',
      mode: 'CUSTOM',
      direction: null,
      percentage: null,
      rounding: 'NONE',
      roundingPrecision: 2,
      currency: 'USD',
      entries: [
        {
          unitAmount: null,
          tiers: [{ fromUnit: 1, toUnit: null, unitAmount: 750n }],
        },
      ],
    }
    prisma.priceList.findFirst.mockResolvedValue(list)

    const result = await resolveAmount('ten_1', 'prc_1', 4, 'plist_1')

    expect(result).toEqual({
      currency: 'USD',
      amount: 3_000n,
      priceList: list,
    })
  })

  it('falls back to the base currency when a custom list has no entry', async () => {
    const prisma = prismaRef.current as {
      priceList: { findFirst: ReturnType<typeof vi.fn> }
    }
    prisma.priceList.findFirst.mockResolvedValue({
      id: 'plist_1',
      mode: 'CUSTOM',
      currency: 'USD',
      entries: [],
    })

    const result = await resolveAmount('ten_1', 'prc_1', 2, 'plist_1')

    expect(result).toEqual({
      currency: 'JMD',
      amount: 2_000n,
      priceList: null,
    })
  })
})
