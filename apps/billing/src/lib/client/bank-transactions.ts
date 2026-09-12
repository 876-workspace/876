import type {
  BankTransactionResource,
  BankTransactionCreateInput,
  BankTransactionDeleted,
  BankTransactionUpdateInput,
} from '@/types/banking'

import { request } from './request'

function transactionPath(accountId: string, transactionId?: string) {
  const accountPath = `/api/banking/accounts/${encodeURIComponent(accountId)}/transactions`
  return transactionId
    ? `${accountPath}/${encodeURIComponent(transactionId)}`
    : accountPath
}

export const create = (accountId: string, params: BankTransactionCreateInput) =>
  request<BankTransactionResource>(transactionPath(accountId), {
    method: 'POST',
    body: JSON.stringify(params),
  })

export const update = (
  accountId: string,
  transactionId: string,
  params: BankTransactionUpdateInput
) =>
  request<BankTransactionResource>(transactionPath(accountId, transactionId), {
    method: 'PATCH',
    body: JSON.stringify(params),
  })

const deleteTransaction = (accountId: string, transactionId: string) =>
  request<BankTransactionDeleted>(transactionPath(accountId, transactionId), {
    method: 'DELETE',
  })

export const bankTransactions = {
  create,
  update,
  delete: deleteTransaction,
}
