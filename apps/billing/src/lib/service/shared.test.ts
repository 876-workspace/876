import { beforeEach, describe, expect, it, vi } from 'vitest'

import { hasEnabledCurrency, isUniqueConstraintError } from './shared'

const { prismaRef } = vi.hoisted(() => ({
  prismaRef: { current: null as unknown as Record<string, unknown> },
}))

vi.mock('@/lib/db', () => ({
  get prisma() {
    return prismaRef.current
  },
}))

describe('hasEnabledCurrency', () => {
  beforeEach(() => {
    prismaRef.current = {
      tenantCurrency: { findFirst: vi.fn().mockResolvedValue(null) },
    }
    vi.clearAllMocks()
  })

  it('returns true for an enabled active tenant currency', async () => {
    const tenantCurrency = (
      prismaRef.current as unknown as {
        tenantCurrency: { findFirst: ReturnType<typeof vi.fn> }
      }
    ).tenantCurrency
    tenantCurrency.findFirst.mockResolvedValue({ tenantId: 'ten_123' })

    const result = await hasEnabledCurrency('ten_123', 'JMD')

    expect(result).toBe(true)
    expect(tenantCurrency.findFirst).toHaveBeenCalledTimes(1)
    expect(tenantCurrency.findFirst).toHaveBeenCalledWith({
      where: {
        tenantId: 'ten_123',
        currencyCode: 'JMD',
        isEnabled: true,
        currency: { isActive: true },
      },
      select: { tenantId: true },
    })
  })

  it('returns false when no enabled active tenant currency exists', async () => {
    const result = await hasEnabledCurrency('ten_123', 'USD')

    expect(result).toBe(false)
  })
})

describe('isUniqueConstraintError', () => {
  it('recognizes Prisma P2002 objects', () => {
    expect(isUniqueConstraintError({ code: 'P2002' })).toBe(true)
  })

  it.each([null, undefined, 'P2002', {}, { code: 'P2025' }, { code: 2002 }])(
    'rejects non-P2002 value %j',
    (value) => {
      expect(isUniqueConstraintError(value)).toBe(false)
    }
  )
})
