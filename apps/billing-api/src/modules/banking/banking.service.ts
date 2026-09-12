import { AppHttpError } from '@/http/errors'
import { hasEnabledCurrency } from '@/modules/currencies'
import { generateId } from '@/platform/ids'
import { nowUnixSeconds } from '@/platform/timestamps'
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

function invalidCurrency() {
  return new AppHttpError({
    code: 'validation/invalid-request',
    message: 'Enable the account currency before using it.',
    httpStatus: 422,
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
