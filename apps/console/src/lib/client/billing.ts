import type {
  AdminBillingAccount,
  AdminBillingAccountCreateParams,
  AdminBillingAccountUpdateParams,
  AdminDeletedBillingAccount,
  AdminDeletedSubscription,
  AdminDeletedSubscriptionItem,
  AdminSubscription,
  AdminSubscriptionCreateParams,
  AdminSubscriptionItem,
  AdminSubscriptionItemCreateParams,
  AdminSubscriptionItemUpdateParams,
  AdminSubscriptionUpdateParams,
} from '@876/admin'

import { request } from './request'

export const createAccount = (params: AdminBillingAccountCreateParams) =>
  request<AdminBillingAccount>('/api/billing/accounts', {
    method: 'POST',
    body: JSON.stringify(params),
  })

export const updateAccount = (
  accountId: string,
  params: AdminBillingAccountUpdateParams
) =>
  request<AdminBillingAccount>(
    `/api/billing/accounts/${encodeURIComponent(accountId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(params),
    }
  )

export const deleteAccount = (accountId: string) =>
  request<AdminDeletedBillingAccount>(
    `/api/billing/accounts/${encodeURIComponent(accountId)}`,
    { method: 'DELETE' }
  )

export const createSubscription = (params: AdminSubscriptionCreateParams) =>
  request<AdminSubscription>('/api/billing/subscriptions', {
    method: 'POST',
    body: JSON.stringify(params),
  })

export const updateSubscription = (
  subscriptionId: string,
  params: AdminSubscriptionUpdateParams
) =>
  request<AdminSubscription>(
    `/api/billing/subscriptions/${encodeURIComponent(subscriptionId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(params),
    }
  )

export const deleteSubscription = (subscriptionId: string) =>
  request<AdminDeletedSubscription>(
    `/api/billing/subscriptions/${encodeURIComponent(subscriptionId)}`,
    { method: 'DELETE' }
  )

export const createSubscriptionItem = (
  subscriptionId: string,
  params: AdminSubscriptionItemCreateParams
) =>
  request<AdminSubscriptionItem>(
    `/api/billing/subscriptions/${encodeURIComponent(subscriptionId)}/items`,
    {
      method: 'POST',
      body: JSON.stringify(params),
    }
  )

export const updateSubscriptionItem = (
  subscriptionId: string,
  itemId: string,
  params: AdminSubscriptionItemUpdateParams
) =>
  request<AdminSubscriptionItem>(
    `/api/billing/subscriptions/${encodeURIComponent(subscriptionId)}/items/${encodeURIComponent(itemId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(params),
    }
  )

export const deleteSubscriptionItem = (
  subscriptionId: string,
  itemId: string
) =>
  request<AdminDeletedSubscriptionItem>(
    `/api/billing/subscriptions/${encodeURIComponent(subscriptionId)}/items/${encodeURIComponent(itemId)}`,
    { method: 'DELETE' }
  )

export const billing = {
  createAccount,
  updateAccount,
  deleteAccount,
  createSubscription,
  updateSubscription,
  deleteSubscription,
  createSubscriptionItem,
  updateSubscriptionItem,
  deleteSubscriptionItem,
}
