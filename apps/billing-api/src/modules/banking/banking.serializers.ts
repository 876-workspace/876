import type { BankAccount, BankTransaction } from '@/db'

export function serializeBankAccount(row: BankAccount & { balance: bigint }) {
  const booksBalance = row.balance.toString()

  return {
    object: 'bank_account' as const,
    id: row.id,
    name: row.name,
    accountType: row.accountType,
    currency: row.currency,
    description: row.description,
    directoryBankId: row.directoryBankId,
    directoryBranchId: row.directoryBranchId,
    institutionName: row.institutionName,
    accountHolderName: row.accountHolderName,
    accountNumberLast4: row.accountNumberLast4,
    openingBalance: row.openingBalance.toString(),
    openingBalanceAt: row.openingBalanceAt,
    isActive: row.isActive,
    balance: booksBalance,
    booksBalance,
    bankBalance: row.bankBalance?.toString() ?? null,
    bankBalanceAt: row.bankBalanceAt,
    lastStatementBalance: row.lastStatementBalance?.toString() ?? null,
    lastStatementAt: row.lastStatementAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export function serializeBankTransaction(row: BankTransaction) {
  return {
    object: 'bank_transaction' as const,
    id: row.id,
    accountId: row.accountId,
    paymentId: row.paymentId,
    type: row.type,
    amount: row.amount.toString(),
    date: row.date,
    description: row.description,
    status: row.status,
    reference: row.reference,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}
