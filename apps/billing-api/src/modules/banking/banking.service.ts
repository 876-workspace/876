import { AppHttpError } from '@/http/errors'
import { hasEnabledCurrency } from '@/modules/currencies'
import { generateId } from '@/platform/ids'
import { nowUnixSeconds } from '@/platform/timestamps'
import {
  CoreDirectoryUnavailableError,
  HttpCoreDirectoryGateway,
} from '@/providers/core-directory'
import {
  createBankAccountRow,
  createBankTransactionRow,
  deleteBankAccountRow,
  deleteBankTransactionRow,
  findBankAccountActivityRow,
  findBankAccountRow,
  findBankTransactionRow,
  listBankAccountRows,
  listBankTransactionRows,
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
  return listing(
    (await listBankAccountRows(tenantId)).map(serializeBankAccount),
    '/api/v1/banking/accounts'
  )
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
    const row = await createBankAccountRow(
      tenantId,
      generateId('BankAccount'),
      body,
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

  const row = await updateBankAccountRow(tenantId, id, body, nowUnixSeconds())
  if (!row) throw missing('account')

  return serializeBankAccount(row)
}

export async function deleteBankAccount(tenantId: string, id: string) {
  const current = await findBankAccountActivityRow(tenantId, id)
  if (!current) throw missing('account')
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
