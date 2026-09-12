import { Request } from '../request'
import type { Runtime } from '../runtime'
import {
  BankAccountDeletedSchema,
  BankAccountListSchema,
  BankAccountSchema,
} from '../schemas'
import type {
  BankAccount,
  BankAccountCreateParams,
  BankAccountDeleted,
  BankAccountNumber,
  BankAccountUpdateParams,
  List,
  RequestOptions,
} from '../types'
import { BankAccountNumberSchema } from '../types'

/** `$876.billing.bankAccounts.*` - tenant-owned financial accounts. */
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
      return Request<BankAccount>(
        runtime,
        {
          method: 'POST',
          path: '/api/v1/banking/accounts',
          body: params,
          signal: options?.signal,
        },
        BankAccountSchema
      )
    },
    /**
     * The full account number, sealed at rest. Requires `banking:write`; every
     * disclosure is logged by the Billing API.
     */
    accountNumber: {
      retrieve(accountId: string, options?: RequestOptions) {
        return Request<BankAccountNumber>(
          runtime,
          {
            method: 'GET',
            path: `/api/v1/banking/accounts/${encodeURIComponent(accountId)}/account-number`,
            signal: options?.signal,
          },
          BankAccountNumberSchema
        )
      },
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
      return Request<BankAccount>(
        runtime,
        {
          method: 'PATCH',
          path: `/api/v1/banking/accounts/${encodeURIComponent(accountId)}`,
          body: params,
          signal: options?.signal,
        },
        BankAccountSchema
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
