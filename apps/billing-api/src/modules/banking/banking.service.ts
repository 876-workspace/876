import { AppHttpError } from '@/http/errors'
import { hasEnabledCurrency } from '@/modules/currencies'
import { generateId } from '@/platform/ids'
import { getLogger } from '@/platform/logger'
import {
  bankAccountNumberContext,
  getSecureFieldProvider,
} from '@/platform/secure-field'
import { nowUnixSeconds } from '@/platform/timestamps'
import { getVaultClient } from '@/providers/workos'
import {
  CoreDirectoryUnavailableError,
  HttpCoreDirectoryGateway,
} from '@/providers/core-directory'
import {
  createBankAccountRow,
  createBankTransactionRow,
  deleteBankAccountRow,
  deleteBankTransactionRow,
  ensureSystemBankAccounts,
  findBankAccountActivityRow,
  findBankAccountNumberRow,
  findBankAccountRow,
  findBankTransactionRow,
  listBankAccountRows,
  listBankTransactionRows,
  type SealedAccountNumber,
  updateBankAccountRow,
  updateBankTransactionRow,
} from './banking.repository'
import type {
  BankAccountCreateBody,
  BankAccountUpdateBody,
  BankTransactionCreateBody,
  BankTransactionUpdateBody,
} from './banking.schemas'
import {
  serializeBankAccount,
  serializeBankTransaction,
} from './banking.serializers'

const coreDirectory = new HttpCoreDirectoryGateway()
const log = getLogger('banking')

async function sealAccountNumber(
  tenantId: string,
  bankAccountId: string,
  accountNumber: string
): Promise<SealedAccountNumber> {
  const provider = getSecureFieldProvider(tenantId, getVaultClient())
  const sealed = await provider.seal(
    accountNumber,
    bankAccountNumberContext({ tenantId, bankAccountId })
  )

  return { ...sealed, last4: accountNumber.slice(-4) }
}

function listing<T>(data: T[], url: string) {
  return {
    object: 'list' as const,
    data,
    has_more: false,
    total_count: data.length,
    url,
  }
}

function missing(type: 'account' | 'transaction') {
  return new AppHttpError({
    code: `bank_${type}/not-found`,
    message:
      type === 'account'
        ? 'Bank account not found.'
        : 'Bank transaction not found.',
    httpStatus: 404,
  })
}

function state(message: string) {
  return new AppHttpError({
    code: 'banking/invalid-state',
    message,
    httpStatus: 409,
  })
}

function invalid(message: string) {
  return new AppHttpError({
    code: 'validation/invalid-request',
    message,
    httpStatus: 422,
  })
}

function invalidCurrency() {
  return invalid('Enable the account currency before using it.')
}

function directoryUnavailable() {
  return new AppHttpError({
    code: 'banking/directory-unavailable',
    message: 'The bank directory is temporarily unavailable. Try again.',
    httpStatus: 503,
  })
}

function hasAccountHistory(
  counts: {
    payments: number
    transactions: number
    statementImports: number
    reconciliations: number
  }
): boolean {
  return Boolean(
    counts.payments ||
      counts.transactions ||
      counts.statementImports ||
      counts.reconciliations
  )
}

function hasOwn(body: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(body, key)
}

async function validateDirectoryReferences(
  directoryBankId: string | null,
  directoryBranchId: string | null
): Promise<void> {
  if (directoryBranchId && !directoryBankId)
    throw invalid('A directory branch requires a directory bank.')
  if (!directoryBankId) return

  try {
    const bank = await coreDirectory.bank(directoryBankId)
    if (!bank) throw invalid('The selected bank no longer exists in the directory.')

    if (!directoryBranchId) return
    const branch = await coreDirectory.branch(directoryBranchId)
    if (!branch)
      throw invalid('The selected bank branch no longer exists in the directory.')
    if (branch.bankId !== directoryBankId)
      throw invalid('The selected branch does not belong to the selected bank.')
  } catch (error) {
    if (error instanceof CoreDirectoryUnavailableError)
      throw directoryUnavailable()
    throw error
  }
}

export async function listBankAccounts(tenantId: string) {
  await ensureSystemAccounts(tenantId)
  return listing(
    (await listBankAccountRows(tenantId)).map(serializeBankAccount),
    '/api/v1/banking/accounts'
  )
}

export async function ensureSystemAccounts(tenantId: string) {
  await ensureSystemBankAccounts(tenantId, nowUnixSeconds())
}

export async function retrieveBankAccount(tenantId: string, id: string) {
  const row = await findBankAccountRow(tenantId, id)
  if (!row) throw missing('account')

  return serializeBankAccount(row)
}

export async function createBankAccount(
  tenantId: string,
  body: BankAccountCreateBody
) {
  if (!(await hasEnabledCurrency(tenantId, body.currency)))
    throw invalidCurrency()

  await validateDirectoryReferences(
    body.directoryBankId ?? null,
    body.directoryBranchId ?? null
  )

  try {
    const id = generateId('BankAccount')
    const { accountNumber, ...fields } = body
    const sealed = accountNumber
      ? await sealAccountNumber(tenantId, id, accountNumber)
      : null
    const row = await createBankAccountRow(
      tenantId,
      id,
      fields,
      sealed,
      nowUnixSeconds()
    )

    return serializeBankAccount({
      ...row,
      balance: row.openingBalance,
    })
  } catch (error) {
    if (isUnique(error))
      throw new AppHttpError({
        code: 'bank_account/conflict',
        message: 'A bank account with this name already exists.',
        httpStatus: 409,
      })
    throw error
  }
}

export async function updateBankAccount(
  tenantId: string,
  id: string,
  body: BankAccountUpdateBody
) {
  const current = await findBankAccountActivityRow(tenantId, id)
  if (!current) throw missing('account')
  if (
    current.isSystem &&
    (body.isActive === false || body.accountType !== undefined || body.name !== undefined)
  ) throw state('System cash accounts cannot be renamed, deactivated, or retyped.')

  if (body.currency && body.currency !== current.currency) {
    if (hasAccountHistory(current._count))
      throw state('An account with financial or statement history cannot change currency.')
    if (!(await hasEnabledCurrency(tenantId, body.currency)))
      throw invalidCurrency()
  }

  const nextDirectoryBankId = hasOwn(body, 'directoryBankId')
    ? (body.directoryBankId ?? null)
    : current.directoryBankId
  const nextDirectoryBranchId = hasOwn(body, 'directoryBranchId')
    ? (body.directoryBranchId ?? null)
    : current.directoryBranchId

  if (
    hasOwn(body, 'directoryBankId') &&
    body.directoryBankId !== current.directoryBankId &&
    current.directoryBranchId &&
    !hasOwn(body, 'directoryBranchId')
  )
    throw invalid(
      'Changing the directory bank requires selecting or clearing the directory branch.'
    )

  if (
    hasOwn(body, 'directoryBankId') ||
    hasOwn(body, 'directoryBranchId')
  )
    await validateDirectoryReferences(
      nextDirectoryBankId,
      nextDirectoryBranchId
    )

  const { accountNumber, ...fields } = body
  let sealed: SealedAccountNumber | null | undefined
  if (accountNumber === null) sealed = null
  else if (accountNumber !== undefined)
    sealed = await sealAccountNumber(tenantId, id, accountNumber)

  const row = await updateBankAccountRow(
    tenantId,
    id,
    fields,
    sealed,
    nowUnixSeconds()
  )
  if (!row) throw missing('account')

  return serializeBankAccount(row)
}

/**
 * Disclose a tenant's own full account number. Guarded by `banking:write` at
 * the route; every disclosure is logged without the value.
 */
export async function retrieveBankAccountNumber(
  tenantId: string,
  id: string,
  actor: { userId: string | null; appId: string | null }
) {
  const row = await findBankAccountNumberRow(tenantId, id)
  if (!row) throw missing('account')
  if (!row.accountNumberCiphertext || !row.accountNumberProvider)
    throw new AppHttpError({
      code: 'bank_account/number-not-on-file',
      message: 'This bank account has no account number on file.',
      httpStatus: 404,
    })

  const accountNumber = await getSecureFieldProvider(
    tenantId,
    getVaultClient()
  ).unseal(
    {
      ciphertext: row.accountNumberCiphertext,
      keyId: row.accountNumberKeyId,
      provider: row.accountNumberProvider,
    },
    bankAccountNumberContext({ tenantId, bankAccountId: row.id })
  )

  log.info(
    { tenantId, bankAccountId: row.id, userId: actor.userId, appId: actor.appId },
    'banking.account_number.disclosed'
  )

  return {
    object: 'bank_account_number' as const,
    accountId: row.id,
    accountNumber,
    accountNumberLast4: accountNumber.slice(-4),
  }
}

export async function deleteBankAccount(tenantId: string, id: string) {
  const current = await findBankAccountActivityRow(tenantId, id)
  if (!current) throw missing('account')
  if (current.isSystem)
    throw state('System cash accounts cannot be deleted.')
  if (hasAccountHistory(current._count))
    throw state(
      'Archive this account instead because it has financial or statement history.'
    )

  await deleteBankAccountRow(tenantId, id)

  return { object: 'bank_account' as const, id, deleted: true as const }
}

export async function listBankTransactions(
  tenantId: string,
  accountId: string
) {
  if (!(await findBankAccountRow(tenantId, accountId))) throw missing('account')

  return listing(
    (await listBankTransactionRows(tenantId, accountId)).map(
      serializeBankTransaction
    ),
    `/api/v1/banking/accounts/${accountId}/transactions`
  )
}

export async function retrieveBankTransaction(
  tenantId: string,
  accountId: string,
  id: string
) {
  const row = await findBankTransactionRow(tenantId, accountId, id)
  if (!row) throw missing('transaction')

  return serializeBankTransaction(row)
}

export async function createBankTransaction(
  tenantId: string,
  accountId: string,
  body: BankTransactionCreateBody
) {
  const account = await findBankAccountActivityRow(tenantId, accountId)
  if (!account?.isActive) throw missing('account')

  return serializeBankTransaction(
    await createBankTransactionRow(
      tenantId,
      accountId,
      generateId('BankTransaction'),
      body,
      nowUnixSeconds()
    )
  )
}

export async function updateBankTransaction(
  tenantId: string,
  accountId: string,
  id: string,
  body: BankTransactionUpdateBody
) {
  const current = await findBankTransactionRow(tenantId, accountId, id)
  if (!current) throw missing('transaction')
  if (current.paymentId)
    throw state('Payment-matched transactions must be edited as payments.')
  if (current.transferId)
    throw state('Transfer transactions must be edited through the transfer.')
  if (current.depositId)
    throw state('Deposit transactions must be edited through the deposit.')

  const row = await updateBankTransactionRow(
    tenantId,
    accountId,
    id,
    body,
    nowUnixSeconds()
  )
  if (!row) throw missing('transaction')

  return serializeBankTransaction(row)
}

export async function deleteBankTransaction(
  tenantId: string,
  accountId: string,
  id: string
) {
  const current = await findBankTransactionRow(tenantId, accountId, id)
  if (!current) throw missing('transaction')
  if (current.paymentId)
    throw state('Payment-matched transactions must be deleted as payments.')
  if (current.transferId)
    throw state('Transfer transactions must be reversed through the transfer.')
  if (current.depositId)
    throw state('Deposit transactions must be reversed through the deposit.')

  await deleteBankTransactionRow(tenantId, accountId, id)

  return { object: 'bank_transaction' as const, id, deleted: true as const }
}

function isUnique(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  )
}
