import { Request } from '../request'
import type { Runtime } from '../runtime'
import {
  BankTransactionCreatedSchema,
  BankTransactionDeletedSchema,
  BankTransactionListSchema,
  BankTransactionSchema,
} from '../schemas'
import type {
  BankTransaction,
  BankTransactionCreated,
  BankTransactionCreateParams,
  BankTransactionDeleted,
  BankTransactionUpdateParams,
  List,
  RequestOptions,
} from '../types'

function transactionPath(accountId: string, transactionId?: string) {
  const accountPath = `/api/v1/banking/accounts/${encodeURIComponent(accountId)}/transactions`
  return transactionId
    ? `${accountPath}/${encodeURIComponent(transactionId)}`
    : accountPath
}

/** `$billing.bankTransactions.*` - manual account credits and debits. */
export function createBankTransactionsResource(runtime: Runtime) {
  return {
    list(accountId: string, options?: RequestOptions) {
      return Request<List<BankTransaction>>(
        runtime,
        {
          method: 'GET',
          path: transactionPath(accountId),
          signal: options?.signal,
        },
        BankTransactionListSchema
      )
    },
    create(
      accountId: string,
      params: BankTransactionCreateParams,
      options?: RequestOptions
    ) {
      return Request<BankTransactionCreated>(
        runtime,
        {
          method: 'POST',
          path: transactionPath(accountId),
          body: params,
          signal: options?.signal,
        },
        BankTransactionCreatedSchema
      )
    },
    retrieve(
      accountId: string,
      transactionId: string,
      options?: RequestOptions
    ) {
      return Request<BankTransaction>(
        runtime,
        {
          method: 'GET',
          path: transactionPath(accountId, transactionId),
          signal: options?.signal,
        },
        BankTransactionSchema
      )
    },
    update(
      accountId: string,
      transactionId: string,
      params: BankTransactionUpdateParams,
      options?: RequestOptions
    ) {
      return Request<BankTransactionCreated>(
        runtime,
        {
          method: 'PATCH',
          path: transactionPath(accountId, transactionId),
          body: params,
          signal: options?.signal,
        },
        BankTransactionCreatedSchema
      )
    },
    delete(accountId: string, transactionId: string, options?: RequestOptions) {
      return Request<BankTransactionDeleted>(
        runtime,
        {
          method: 'DELETE',
          path: transactionPath(accountId, transactionId),
          signal: options?.signal,
        },
        BankTransactionDeletedSchema
      )
    },
  }
}
