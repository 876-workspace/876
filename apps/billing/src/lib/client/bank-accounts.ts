import type {
  BankAccountCreated,
  BankAccountCreateInput,
  BankAccountDeleted,
  BankAccountUpdated,
  BankAccountUpdateInput,
} from '@/types/banking'

import { request } from './request'

export const create = (params: BankAccountCreateInput) =>
  request<BankAccountCreated>('/api/v1/banking/accounts', {
    method: 'POST',
    body: JSON.stringify(params),
  })

export const update = (accountId: string, params: BankAccountUpdateInput) =>
  request<BankAccountUpdated>(
    `/api/v1/banking/accounts/${encodeURIComponent(accountId)}`,
    { method: 'PATCH', body: JSON.stringify(params) }
  )

const deleteAccount = (accountId: string) =>
  request<BankAccountDeleted>(
    `/api/v1/banking/accounts/${encodeURIComponent(accountId)}`,
    { method: 'DELETE' }
  )

export const bankAccounts = { create, update, delete: deleteAccount }
