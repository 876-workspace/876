import type { BankAccount, BankTransaction } from '@/db'

export function serializeBankAccount(row: BankAccount & { balance: bigint }) {
  return {
    object: 'bank_account' as const,
    id: row.id,
    name: row.name,
    accountType: row.accountType,
    currency: row.currency,
    description: row.description,
    isActive: row.isActive,
    balance: row.balance.toString(),
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
