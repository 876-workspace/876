import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  findEngineAccount: vi.fn(),
  createDepositRows: vi.fn(),
  reverseDepositRow: vi.fn(),
}))

vi.mock('../banking-engine.repository', () => mocks)
vi.mock('@/platform/ids', () => ({ generateId: (prefix: string) => `${prefix}_1` }))
vi.mock('@/platform/timestamps', () => ({ nowUnixSeconds: () => 1_700_000_000 }))
vi.mock('@/platform/prisma-errors', () => ({
  isRetryableTransactionError: (error: unknown) =>
    error instanceof Error && error.message === 'serialization failure',
  isUniqueConstraintError: () => false,
}))

import { createBankDeposit, voidBankDeposit } from '../banking-engine.service'

const source = {
  id: 'acct_source',
  currency: 'USD',
  accountType: 'UNDEPOSITED_FUNDS' as const,
  openingBalance: 0n,
  isActive: true,
  isSystem: true,
}
const destination = {
  id: 'acct_destination',
  currency: 'USD',
  accountType: 'CHECKING' as const,
  openingBalance: 0n,
  isActive: true,
  isSystem: false,
}
const body = {
  sourceAccountId: source.id,
  destinationAccountId: destination.id,
  transactionIds: ['txn_1'],
  amount: 100n,
  currency: 'USD',
  depositedAt: 1_700_000_000,
}

function depositRow(status: 'POSTED' | 'REVERSED' = 'POSTED') {
  return {
    id: 'deposit_1',
    tenantId: 'ten_1',
    sourceAccountId: source.id,
    destinationAccountId: destination.id,
    amount: 100n,
    currency: 'USD',
    depositedAt: 1_700_000_000,
    description: null,
    reference: null,
    status,
    reversedAt: status === 'REVERSED' ? 1_700_000_001 : null,
    createdAt: 1_700_000_000,
    updatedAt: 1_700_000_000,
    items: [{ sourceTransactionId: 'txn_1' }],
  }
}

describe('bank deposit service guards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.findEngineAccount.mockImplementation((_: string, id: string) =>
      Promise.resolve(id === source.id ? source : destination)
    )
    mocks.createDepositRows.mockResolvedValue(depositRow())
  })

  it('rejects deposits into the same account before querying or writing', async () => {
    await expect(
      createBankDeposit('ten_1', { ...body, destinationAccountId: source.id })
    ).rejects.toMatchObject({ code: 'validation/invalid-request', httpStatus: 422 })

    expect(mocks.findEngineAccount).not.toHaveBeenCalled()
    expect(mocks.createDepositRows).not.toHaveBeenCalled()
  })

  it('rejects an inactive deposit account', async () => {
    mocks.findEngineAccount.mockResolvedValue({ ...source, isActive: false })

    await expect(createBankDeposit('ten_1', body)).rejects.toMatchObject({
      code: 'banking/invalid-state',
      message: 'Both deposit accounts must be active.',
      httpStatus: 409,
    })
    expect(mocks.createDepositRows).not.toHaveBeenCalled()
  })

  it('rejects a tenant-created holding account as a deposit source', async () => {
    mocks.findEngineAccount.mockResolvedValueOnce({ ...source, isSystem: false })

    await expect(createBankDeposit('ten_1', body)).rejects.toMatchObject({
      code: 'validation/invalid-request',
      httpStatus: 422,
    })
    expect(mocks.createDepositRows).not.toHaveBeenCalled()
  })

  it('rejects a non-bank destination account', async () => {
    mocks.findEngineAccount.mockResolvedValueOnce(source).mockResolvedValueOnce({
      ...destination,
      accountType: 'CASH',
    })

    await expect(createBankDeposit('ten_1', body)).rejects.toMatchObject({
      code: 'validation/invalid-request',
      httpStatus: 422,
    })
    expect(mocks.createDepositRows).not.toHaveBeenCalled()
  })

  it('rejects a currency mismatch', async () => {
    mocks.findEngineAccount.mockResolvedValueOnce(source).mockResolvedValueOnce({
      ...destination,
      currency: 'JMD',
    })

    await expect(createBankDeposit('ten_1', body)).rejects.toMatchObject({
      code: 'validation/invalid-request',
      message: 'Both deposit accounts must use the deposit currency.',
      httpStatus: 422,
    })
    expect(mocks.createDepositRows).not.toHaveBeenCalled()
  })

  it.each(['deposit-items-invalid', 'deposit-amount-invalid'])(
    'rejects %s source rows',
    async (reason) => {
      mocks.createDepositRows.mockRejectedValue(new Error(reason))

      await expect(createBankDeposit('ten_1', body)).rejects.toMatchObject({
        code: 'validation/invalid-request',
        httpStatus: 422,
      })
      expect(mocks.createDepositRows).toHaveBeenCalledTimes(1)
    }
  )

  it('maps a serializable transaction conflict', async () => {
    mocks.createDepositRows.mockRejectedValue(new Error('serialization failure'))

    await expect(createBankDeposit('ten_1', body)).rejects.toMatchObject({
      code: 'banking/invalid-state',
      httpStatus: 409,
    })
  })

  it('rejects voiding an already voided deposit', async () => {
    mocks.reverseDepositRow.mockResolvedValue('reversed')

    await expect(voidBankDeposit('ten_1', 'deposit_1')).rejects.toMatchObject({
      code: 'banking/invalid-state',
      message: 'This deposit has already been voided.',
      httpStatus: 409,
    })
  })

  it('returns the reversed deposit so its original items can be deposited again', async () => {
    mocks.reverseDepositRow.mockResolvedValue(depositRow('REVERSED'))

    await expect(voidBankDeposit('ten_1', 'deposit_1')).resolves.toMatchObject({
      object: 'bank-deposit',
      id: 'deposit_1',
      status: 'reversed',
      transactionIds: ['txn_1'],
    })
    expect(mocks.reverseDepositRow).toHaveBeenCalledWith(
      'ten_1',
      'deposit_1',
      1_700_000_000
    )
  })
})
