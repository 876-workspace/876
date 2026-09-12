import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createBankAccountRow: vi.fn(),
  updateBankAccountRow: vi.fn(),
  findBankAccountActivityRow: vi.fn(),
  findBankAccountNumberRow: vi.fn(),
  hasEnabledCurrency: vi.fn(),
}))

vi.mock('../banking.repository', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../banking.repository')>()),
  createBankAccountRow: mocks.createBankAccountRow,
  updateBankAccountRow: mocks.updateBankAccountRow,
  findBankAccountActivityRow: mocks.findBankAccountActivityRow,
  findBankAccountNumberRow: mocks.findBankAccountNumberRow,
}))

vi.mock('@/modules/currencies', () => ({
  hasEnabledCurrency: mocks.hasEnabledCurrency,
}))

import { resetSettingsForTest } from '@/config'
import {
  bankAccountNumberContext,
  getSecureFieldProvider,
  LOCAL_AESGCM_PREFIX,
} from '@/platform/secure-field'
import { resetVaultClientForTest } from '@/providers/workos'
import {
  createBankAccount,
  retrieveBankAccountNumber,
  updateBankAccount,
} from '../banking.service'
import { bankAccountCreateBodySchema } from '../banking.schemas'

const KEY = Buffer.alloc(32, 9).toString('base64')

function firstCall(mock: ReturnType<typeof vi.fn>) {
  const call = mock.mock.calls[0]
  if (!call) throw new Error('Expected the mock to have been called.')
  return call
}
const ACTOR = { userId: 'user_1', appId: null }

function useLocalKey(key: string | null = KEY) {
  resetVaultClientForTest()
  resetSettingsForTest({
    BILLING_DATABASE_URL: 'postgres://localhost/billing',
    ...(key ? { SECURE_FIELD_KEY: key } : {}),
  } as NodeJS.ProcessEnv)
}

function accountRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'acct_1',
    tenantId: 'ten_1',
    name: 'NCB Operating',
    accountType: 'CHECKING',
    currency: 'JMD',
    description: null,
    directoryBankId: null,
    directoryBranchId: null,
    institutionName: null,
    accountHolderName: 'Acme Freight Ltd',
    accountNumberLast4: null,
    accountNumberCiphertext: null,
    accountNumberKeyId: null,
    accountNumberProvider: null,
    openingBalance: 0n,
    openingBalanceAt: null,
    bankBalance: null,
    bankBalanceAt: null,
    lastStatementBalance: null,
    lastStatementAt: null,
    isActive: true,
    isSystem: false,
    createdAt: 1_700_000_000,
    updatedAt: 1_700_000_000,
    balance: 0n,
    ...overrides,
  }
}

describe('bank account numbers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useLocalKey()
    mocks.hasEnabledCurrency.mockResolvedValue(true)
    mocks.createBankAccountRow.mockImplementation(
      (_tenant, id, _fields, sealed) =>
        Promise.resolve(
          accountRow({ id, accountNumberLast4: sealed?.last4 ?? null })
        )
    )
  })

  afterEach(() => resetVaultClientForTest())

  describe('input normalization', () => {
    it('strips spaces and dashes a bank prints and upper-cases letters', () => {
      const body = bankAccountCreateBodySchema.parse({
        name: 'NCB Operating',
        accountType: 'CHECKING',
        currency: 'jmd',
        accountNumber: '0604-5512 34',
      })

      expect(body.accountNumber).toBe('0604551234')
    })

    it.each(['123', 'A'.repeat(35), '12#45', '<script>'])(
      'rejects %j as an account number',
      (accountNumber) => {
        const result = bankAccountCreateBodySchema.safeParse({
          name: 'NCB Operating',
          accountType: 'CHECKING',
          currency: 'JMD',
          accountNumber,
        })

        expect(result.success).toBe(false)
      }
    )

    it('no longer accepts a client-supplied last four', () => {
      const result = bankAccountCreateBodySchema.safeParse({
        name: 'NCB Operating',
        accountType: 'CHECKING',
        currency: 'JMD',
        accountNumberLast4: '1234',
      })

      expect(result.success).toBe(false)
    })
  })

  describe('createBankAccount', () => {
    it('seals the full number bound to the new account and derives last four', async () => {
      const result = await createBankAccount('ten_1', {
        name: 'NCB Operating',
        accountType: 'CHECKING',
        currency: 'JMD',
        accountNumber: '0604551234',
      })

      expect(mocks.createBankAccountRow).toHaveBeenCalledTimes(1)
      const [tenantId, id, fields, sealed] =
        firstCall(mocks.createBankAccountRow)
      expect(tenantId).toBe('ten_1')
      expect(fields).not.toHaveProperty('accountNumber')
      expect(sealed.last4).toBe('1234')
      expect(sealed.provider).toBe('local_aesgcm')
      expect(sealed.ciphertext.startsWith(LOCAL_AESGCM_PREFIX)).toBe(true)
      expect(sealed.ciphertext).not.toContain('0604551234')
      await expect(
        getSecureFieldProvider('ten_1').unseal(
          sealed,
          bankAccountNumberContext({ tenantId: 'ten_1', bankAccountId: id })
        )
      ).resolves.toBe('0604551234')
      expect(result.accountNumberLast4).toBe('1234')
      expect(result).not.toHaveProperty('accountNumber')
      expect(result).not.toHaveProperty('accountNumberCiphertext')
    })

    it('writes no sealed value when no number is given', async () => {
      await createBankAccount('ten_1', {
        name: 'Petty float',
        accountType: 'CASH',
        currency: 'JMD',
      })

      expect(firstCall(mocks.createBankAccountRow)[3]).toBeNull()
    })

    it('refuses to store a number when no vault or key is configured', async () => {
      useLocalKey(null)

      await expect(
        createBankAccount('ten_1', {
          name: 'NCB Operating',
          accountType: 'CHECKING',
          currency: 'JMD',
          accountNumber: '0604551234',
        })
      ).rejects.toThrow(/No secure field provider is configured/)
      expect(mocks.createBankAccountRow).not.toHaveBeenCalled()
    })
  })

  describe('updateBankAccount', () => {
    beforeEach(() => {
      mocks.findBankAccountActivityRow.mockResolvedValue({
        ...accountRow(),
        _count: {
          payments: 0,
          transactions: 0,
          statementImports: 0,
          reconciliations: 0,
        },
      })
      mocks.updateBankAccountRow.mockResolvedValue(accountRow())
    })

    it('leaves the stored number untouched when the field is absent', async () => {
      await updateBankAccount('ten_1', 'acct_1', { name: 'NCB Payroll' })

      expect(mocks.updateBankAccountRow).toHaveBeenCalledWith(
        'ten_1',
        'acct_1',
        { name: 'NCB Payroll' },
        undefined,
        expect.any(Number)
      )
    })

    it('clears the stored number when it is set to null', async () => {
      await updateBankAccount('ten_1', 'acct_1', { accountNumber: null })

      expect(firstCall(mocks.updateBankAccountRow)[2]).toEqual({})
      expect(firstCall(mocks.updateBankAccountRow)[3]).toBeNull()
    })

    it('reseals a replacement number under the same account', async () => {
      await updateBankAccount('ten_1', 'acct_1', {
        accountNumber: '0604559876',
      })

      const sealed = firstCall(mocks.updateBankAccountRow)[3]
      expect(sealed.last4).toBe('9876')
      await expect(
        getSecureFieldProvider('ten_1').unseal(
          sealed,
          bankAccountNumberContext({
            tenantId: 'ten_1',
            bankAccountId: 'acct_1',
          })
        )
      ).resolves.toBe('0604559876')
    })
  })

  describe('retrieveBankAccountNumber', () => {
    async function sealedRow(bankAccountId = 'acct_1', tenantId = 'ten_1') {
      const sealed = await getSecureFieldProvider(tenantId).seal(
        '0604551234',
        bankAccountNumberContext({ tenantId, bankAccountId })
      )

      return {
        id: 'acct_1',
        accountNumberCiphertext: sealed.ciphertext,
        accountNumberKeyId: sealed.keyId,
        accountNumberProvider: sealed.provider,
        accountNumberLast4: '1234',
      }
    }

    it('discloses the full number for the owning tenant', async () => {
      mocks.findBankAccountNumberRow.mockResolvedValue(await sealedRow())

      const result = await retrieveBankAccountNumber('ten_1', 'acct_1', ACTOR)

      expect(result).toEqual({
        object: 'bank_account_number',
        accountId: 'acct_1',
        accountNumber: '0604551234',
        accountNumberLast4: '1234',
      })
      expect(mocks.findBankAccountNumberRow).toHaveBeenCalledWith(
        'ten_1',
        'acct_1'
      )
    })

    it('returns not found for an account outside the tenant', async () => {
      mocks.findBankAccountNumberRow.mockResolvedValue(null)

      await expect(
        retrieveBankAccountNumber('ten_2', 'acct_1', ACTOR)
      ).rejects.toMatchObject({ code: 'bank_account/not-found' })
    })

    it('reports when no number is on file', async () => {
      mocks.findBankAccountNumberRow.mockResolvedValue({
        id: 'acct_1',
        accountNumberCiphertext: null,
        accountNumberKeyId: null,
        accountNumberProvider: null,
        accountNumberLast4: null,
      })

      await expect(
        retrieveBankAccountNumber('ten_1', 'acct_1', ACTOR)
      ).rejects.toMatchObject({ code: 'bank_account/number-not-on-file' })
    })

    it('refuses a ciphertext copied from another account', async () => {
      mocks.findBankAccountNumberRow.mockResolvedValue(
        await sealedRow('acct_other')
      )

      await expect(
        retrieveBankAccountNumber('ten_1', 'acct_1', ACTOR)
      ).rejects.toThrow()
    })
  })
})
