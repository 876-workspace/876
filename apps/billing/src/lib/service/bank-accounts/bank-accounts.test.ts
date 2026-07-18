import { beforeEach, describe, expect, it, vi } from 'vitest'

import { list } from './list'

const { prismaRef } = vi.hoisted(() => ({
  prismaRef: { current: null as unknown as Record<string, unknown> },
}))

vi.mock('@/lib/db', () => ({
  get prisma() {
    return prismaRef.current
  },
}))

describe('bankAccounts.list', () => {
  beforeEach(() => {
    prismaRef.current = {
      bankAccount: { findMany: vi.fn() },
      bankTransaction: { groupBy: vi.fn() },
    }
    vi.clearAllMocks()
  })

  it('calculates credit less debit from non-excluded transactions', async () => {
    const bankAccount = (
      prismaRef.current as {
        bankAccount: { findMany: ReturnType<typeof vi.fn> }
      }
    ).bankAccount
    const bankTransaction = (
      prismaRef.current as {
        bankTransaction: { groupBy: ReturnType<typeof vi.fn> }
      }
    ).bankTransaction
    bankAccount.findMany.mockResolvedValue([
      {
        id: 'ba_123',
        tenantId: 'ten_123',
        name: 'Operating account',
        accountType: 'CHECKING',
        currency: 'JMD',
        description: null,
        isActive: true,
        createdAt: 1_788_825_600,
        updatedAt: 1_788_825_600,
      },
    ])
    bankTransaction.groupBy.mockResolvedValue([
      { accountId: 'ba_123', type: 'CREDIT', _sum: { amount: 10_000n } },
      { accountId: 'ba_123', type: 'DEBIT', _sum: { amount: 2_500n } },
    ])

    const result = await list('ten_123')

    expect(result[0]?.balance).toBe(7_500n)
    expect(bankTransaction.groupBy).toHaveBeenCalledWith({
      by: ['accountId', 'type'],
      where: { tenantId: 'ten_123', status: { not: 'EXCLUDED' } },
      _sum: { amount: true },
    })
  })

  it('returns zero for an account without transactions', async () => {
    const bankAccount = (
      prismaRef.current as {
        bankAccount: { findMany: ReturnType<typeof vi.fn> }
      }
    ).bankAccount
    const bankTransaction = (
      prismaRef.current as {
        bankTransaction: { groupBy: ReturnType<typeof vi.fn> }
      }
    ).bankTransaction
    bankAccount.findMany.mockResolvedValue([{ id: 'ba_empty' }])
    bankTransaction.groupBy.mockResolvedValue([])

    const result = await list('ten_123')

    expect(result).toEqual([{ id: 'ba_empty', balance: 0n }])
  })
})
