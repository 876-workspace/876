import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  transactionsFindMany: vi.fn(),
  depositCreate: vi.fn(),
  itemsCreateMany: vi.fn(),
  transactionsCreateMany: vi.fn(),
  depositFindFirst: vi.fn(),
  depositUpdate: vi.fn(),
  transactionsUpdateMany: vi.fn(),
}))

vi.mock('@/db/client', () => ({ prisma: { $transaction: mocks.transaction } }))

import { createDepositRows, reverseDepositRow } from '../banking-engine.repository'

const body = {
  sourceAccountId: 'acct_source',
  destinationAccountId: 'acct_destination',
  transactionIds: ['txn_1'],
  amount: 100n,
  currency: 'USD',
  depositedAt: 1_700_000_000,
}
const ids = {
  deposit: 'deposit_1',
  debit: 'txn_debit',
  credit: 'txn_credit',
  items: ['item_1'],
}

describe('deposit repository', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.transaction.mockImplementation((work) =>
      work({
        bankTransaction: {
          findMany: mocks.transactionsFindMany,
          createMany: mocks.transactionsCreateMany,
          updateMany: mocks.transactionsUpdateMany,
        },
        bankDeposit: {
          create: mocks.depositCreate,
          findFirst: mocks.depositFindFirst,
          update: mocks.depositUpdate,
        },
        bankDepositItem: { createMany: mocks.itemsCreateMany },
      })
    )
    mocks.transactionsFindMany.mockResolvedValue([
      { id: 'txn_1', amount: 100n },
    ])
    mocks.depositCreate.mockResolvedValue({ id: ids.deposit, ...body })
    mocks.itemsCreateMany.mockResolvedValue({ count: 1 })
    mocks.transactionsCreateMany.mockResolvedValue({ count: 2 })
  })

  it('requires incoming credits from the selected tenant source account', async () => {
    await createDepositRows('ten_1', ids, body, 1_700_000_000)

    expect(mocks.transactionsFindMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'ten_1',
        accountId: 'acct_source',
        id: { in: ['txn_1'] },
        type: 'CREDIT',
        depositSourceItems: { none: { deposit: { status: 'POSTED' } } },
      },
    })
  })

  it('rejects source transactions missing from the source account or tenant', async () => {
    mocks.transactionsFindMany.mockResolvedValue([])

    await expect(
      createDepositRows('ten_1', ids, body, 1_700_000_000)
    ).rejects.toThrow('deposit-items-invalid')
    expect(mocks.depositCreate).not.toHaveBeenCalled()
  })

  it('rejects a submitted amount that does not equal the selected credits', async () => {
    mocks.transactionsFindMany.mockResolvedValue([{ id: 'txn_1', amount: 99n }])

    await expect(
      createDepositRows('ten_1', ids, body, 1_700_000_000)
    ).rejects.toThrow('deposit-amount-invalid')
    expect(mocks.depositCreate).not.toHaveBeenCalled()
  })

  it('excludes generated deposit movements when voiding so the source credit is reusable', async () => {
    mocks.depositFindFirst
      .mockResolvedValueOnce({ id: ids.deposit, status: 'POSTED' })
      .mockResolvedValueOnce({ id: ids.deposit, status: 'REVERSED', items: [] })
    mocks.depositUpdate.mockResolvedValue({ id: ids.deposit })
    mocks.transactionsUpdateMany.mockResolvedValue({ count: 2 })

    await expect(
      reverseDepositRow('ten_1', ids.deposit, 1_700_000_001)
    ).resolves.toEqual({ id: ids.deposit, status: 'REVERSED', items: [] })
    expect(mocks.transactionsUpdateMany).toHaveBeenCalledWith({
      where: { tenantId: 'ten_1', depositId: ids.deposit },
      data: { status: 'EXCLUDED', updatedAt: 1_700_000_001 },
    })
  })
})
