import type {
  BankAccountResource,
  BankAccountCreateInput,
  BankAccountDeleted,
  BankAccountNumberResource,
  BankAccountUpdateInput,
} from '@/types/banking'

import { request } from './request'

const COLLECTION = '/api/banking/accounts'

export const create = (params: BankAccountCreateInput) =>
  request<BankAccountResource>(COLLECTION, {
    method: 'POST',
    body: JSON.stringify(params),
  })

export const update = (accountId: string, params: BankAccountUpdateInput) =>
  request<BankAccountResource>(`${COLLECTION}/${encodeURIComponent(accountId)}`, {
    method: 'PATCH',
    body: JSON.stringify(params),
  })

const deleteAccount = (accountId: string) =>
  request<BankAccountDeleted>(`${COLLECTION}/${encodeURIComponent(accountId)}`, {
    method: 'DELETE',
  })

// The full number is sealed at rest and only returned on explicit request.
const retrieveAccountNumber = (accountId: string) =>
  request<BankAccountNumberResource>(
    `${COLLECTION}/${encodeURIComponent(accountId)}/account-number`
  )

export const bankAccounts = {
  create,
  update,
  delete: deleteAccount,
  accountNumber: { retrieve: retrieveAccountNumber },
}
