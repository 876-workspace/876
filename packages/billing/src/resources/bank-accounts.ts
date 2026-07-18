import { Request } from '../request'
import type { Runtime } from '../runtime'
import {
  BankAccountCreatedSchema,
  BankAccountDeletedSchema,
  BankAccountListSchema,
  BankAccountSchema,
} from '../schemas'
import type {
  BankAccount,
  BankAccountCreated,
  BankAccountCreateParams,
  BankAccountDeleted,
  BankAccountUpdateParams,
  List,
  RequestOptions,
} from '../types'

/** `$billing.bankAccounts.*` - tenant-owned financial accounts. */
export function createBankAccountsResource(runtime: Runtime) {
  return {
    list(options?: RequestOptions) {
      return Request<List<BankAccount>>(
        runtime,
        {
          method: 'GET',
          path: '/api/v1/banking/accounts',
          signal: options?.signal,
        },
        BankAccountListSchema
      )
    },
    create(params: BankAccountCreateParams, options?: RequestOptions) {
      return Request<BankAccountCreated>(
        runtime,
        {
          method: 'POST',
          path: '/api/v1/banking/accounts',
          body: params,
          signal: options?.signal,
        },
        BankAccountCreatedSchema
      )
    },
    retrieve(accountId: string, options?: RequestOptions) {
      return Request<BankAccount>(
        runtime,
        {
          method: 'GET',
          path: `/api/v1/banking/accounts/${encodeURIComponent(accountId)}`,
          signal: options?.signal,
        },
        BankAccountSchema
      )
    },
    update(
      accountId: string,
      params: BankAccountUpdateParams,
      options?: RequestOptions
    ) {
      return Request<BankAccountCreated>(
        runtime,
        {
          method: 'PATCH',
          path: `/api/v1/banking/accounts/${encodeURIComponent(accountId)}`,
          body: params,
          signal: options?.signal,
        },
        BankAccountCreatedSchema
      )
    },
    delete(accountId: string, options?: RequestOptions) {
      return Request<BankAccountDeleted>(
        runtime,
        {
          method: 'DELETE',
          path: `/api/v1/banking/accounts/${encodeURIComponent(accountId)}`,
          signal: options?.signal,
        },
        BankAccountDeletedSchema
      )
    },
  }
}
