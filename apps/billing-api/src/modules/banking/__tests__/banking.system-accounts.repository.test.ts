import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  tenantFindUnique: vi.fn(),
  accountFindFirst: vi.fn(),
  accountCreateMany: vi.fn(),
}))

vi.mock('@/db/client', () => ({
  prisma: {
    tenant: { findUnique: mocks.tenantFindUnique },
    bankAccount: {
      findFirst: mocks.accountFindFirst,
      createMany: mocks.accountCreateMany,
    },
  },
}))

import { ensureSystemBankAccounts } from '../banking.repository'

describe('ensureSystemBankAccounts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.tenantFindUnique.mockResolvedValue({ defaultCurrency: 'USD' })
    mocks.accountCreateMany.mockResolvedValue({ count: 1 })
  })

  it('is idempotent when both system accounts already exist', async () => {
    mocks.accountFindFirst.mockImplementation(({ where }) =>
      Promise.resolve(
        where.isSystem ? { id: `system_${where.accountType}` } : null
      )
    )

    await ensureSystemBankAccounts('ten_1', 1_700_000_000)

    expect(mocks.accountCreateMany).not.toHaveBeenCalled()
    expect(mocks.accountFindFirst).toHaveBeenCalledTimes(2)
  })

  it('keeps an adopted system account instead of creating a duplicate', async () => {
    mocks.accountFindFirst.mockImplementation(({ where }) =>
      Promise.resolve(
        where.isSystem && where.accountType === 'UNDEPOSITED_FUNDS'
          ? { id: 'acct_oldest_active' }
          : where.isSystem
            ? { id: 'acct_petty_cash' }
            : null
      )
    )

    await ensureSystemBankAccounts('ten_1', 1_700_000_000)

    expect(mocks.accountCreateMany).not.toHaveBeenCalled()
    expect(mocks.accountFindFirst).toHaveBeenCalledWith({
      where: {
        tenantId: 'ten_1',
        accountType: 'UNDEPOSITED_FUNDS',
        isSystem: true,
      },
      select: { id: true },
    })
  })

  it('uses the System suffix when a tenant already owns the default name', async () => {
    let systemCreated = false
    mocks.accountFindFirst.mockImplementation(({ where }) => {
      if (where.isSystem)
        return Promise.resolve(systemCreated ? { id: 'system_1' } : null)
      return Promise.resolve(
        where.name === 'Undeposited Funds' ? { id: 'acct_named' } : null
      )
    })
    mocks.accountCreateMany.mockImplementation(({ data }) => {
      systemCreated = true
      return Promise.resolve({ count: 1, data })
    })

    await ensureSystemBankAccounts('ten_1', 1_700_000_000)

    expect(mocks.accountCreateMany).toHaveBeenCalledWith({
      data: expect.objectContaining({
        accountType: 'UNDEPOSITED_FUNDS',
        name: 'Undeposited Funds (System)',
        isSystem: true,
      }),
      skipDuplicates: true,
    })
  })
})
