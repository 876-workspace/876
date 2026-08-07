/**
 * OpenAPI prose for the Billing module. Pure data — factual descriptions derived from
 * what each route actually does.
 */

export const DISPATCH_BILLING_CUSTOMER_SYNC_SUMMARY =
  'Dispatch billing customer sync'
export const DISPATCH_BILLING_CUSTOMER_SYNC_DESCRIPTION =
  'Claims and delivers pending billing customer outbox events to the billing provider. **Admin only**.'

export const DISPATCH_BILLING_CUSTOMER_SYNC_RESPONSES = {
  401: { description: 'Missing or invalid internal key.' },
  403: { description: 'Caller is not an admin.' },
} as const

export const RECONCILE_BILLING_CUSTOMER_SYNC_SUMMARY =
  'Reconcile billing customer sync'
export const RECONCILE_BILLING_CUSTOMER_SYNC_DESCRIPTION =
  'Enqueues billing customer ensure events for all organizations and known users. **Admin only**.'

export const RECONCILE_BILLING_CUSTOMER_SYNC_RESPONSES = {
  401: { description: 'Missing or invalid internal key.' },
  403: { description: 'Caller is not an admin.' },
} as const

export const RECONCILE_FINANCE_PROVISIONING_SUMMARY =
  'Reconcile finance provisioning'
export const RECONCILE_FINANCE_PROVISIONING_DESCRIPTION =
  'Scans subscriptions and enqueues finance connection ensure events where lifecycle state has changed. **Admin only**.'

export const RECONCILE_FINANCE_PROVISIONING_RESPONSES = {
  401: { description: 'Missing or invalid internal key.' },
  403: { description: 'Caller is not an admin.' },
} as const

export const DISPATCH_FINANCE_PROVISIONING_SUMMARY =
  'Dispatch finance provisioning'
export const DISPATCH_FINANCE_PROVISIONING_DESCRIPTION =
  'Claims and delivers pending finance provisioning outbox events. **Admin only**.'

export const DISPATCH_FINANCE_PROVISIONING_RESPONSES = {
  401: { description: 'Missing or invalid internal key.' },
  403: { description: 'Caller is not an admin.' },
} as const

export const LIST_BILLING_ACCOUNTS_SUMMARY = 'List billing accounts'
export const LIST_BILLING_ACCOUNTS_DESCRIPTION =
  'Returns billing accounts, optionally filtered by organization. **Admin only**.'

export const LIST_BILLING_ACCOUNTS_RESPONSES = {
  401: { description: 'Missing or invalid internal key.' },
  403: { description: 'Caller is not an admin.' },
} as const

export const CREATE_BILLING_ACCOUNT_SUMMARY = 'Create billing account'
export const CREATE_BILLING_ACCOUNT_DESCRIPTION =
  'Creates a billing account. **Admin only**.'

export const CREATE_BILLING_ACCOUNT_RESPONSES = {
  401: { description: 'Missing or invalid internal key.' },
  403: { description: 'Caller is not an admin.' },
} as const

export const RETRIEVE_BILLING_ACCOUNT_SUMMARY = 'Retrieve billing account'
export const RETRIEVE_BILLING_ACCOUNT_DESCRIPTION =
  'Returns a billing account by ID. **Admin only**.'

export const RETRIEVE_BILLING_ACCOUNT_RESPONSES = {
  401: { description: 'Missing or invalid internal key.' },
  403: { description: 'Caller is not an admin.' },
  404: { description: 'Billing account not found.' },
} as const

export const UPDATE_BILLING_ACCOUNT_SUMMARY = 'Update billing account'
export const UPDATE_BILLING_ACCOUNT_DESCRIPTION =
  'Updates a billing account. **Admin only**.'

export const UPDATE_BILLING_ACCOUNT_RESPONSES = {
  401: { description: 'Missing or invalid internal key.' },
  403: { description: 'Caller is not an admin.' },
  404: { description: 'Billing account not found.' },
} as const

export const DELETE_BILLING_ACCOUNT_SUMMARY = 'Delete billing account'
export const DELETE_BILLING_ACCOUNT_DESCRIPTION =
  'Deletes a billing account. **Admin only**.'

export const DELETE_BILLING_ACCOUNT_RESPONSES = {
  401: { description: 'Missing or invalid internal key.' },
  403: { description: 'Caller is not an admin.' },
  404: { description: 'Billing account not found.' },
} as const

export const CREATE_SUBSCRIPTION_SUMMARY = 'Create subscription'
export const CREATE_SUBSCRIPTION_DESCRIPTION =
  'Creates a subscription for an organization. **Admin only**.'

export const CREATE_SUBSCRIPTION_RESPONSES = {
  401: { description: 'Missing or invalid internal key.' },
  403: { description: 'Caller is not an admin.' },
  404: { description: 'Organization, app, or billing account not found.' },
} as const

export const LIST_SUBSCRIPTIONS_SUMMARY = 'List subscriptions'
export const LIST_SUBSCRIPTIONS_DESCRIPTION =
  'Returns subscriptions filtered by organization or app. **Admin only**.'

export const LIST_SUBSCRIPTIONS_RESPONSES = {
  401: { description: 'Missing or invalid internal key.' },
  403: { description: 'Caller is not an admin.' },
} as const

export const RETRIEVE_SUBSCRIPTION_SUMMARY = 'Retrieve subscription'
export const RETRIEVE_SUBSCRIPTION_DESCRIPTION =
  'Returns a subscription by ID. **Admin only**.'

export const RETRIEVE_SUBSCRIPTION_RESPONSES = {
  401: { description: 'Missing or invalid internal key.' },
  403: { description: 'Caller is not an admin.' },
  404: { description: 'Subscription not found.' },
} as const

export const UPDATE_SUBSCRIPTION_SUMMARY = 'Update subscription'
export const UPDATE_SUBSCRIPTION_DESCRIPTION =
  'Updates a subscription. **Admin only**.'

export const UPDATE_SUBSCRIPTION_RESPONSES = {
  401: { description: 'Missing or invalid internal key.' },
  403: { description: 'Caller is not an admin.' },
  404: { description: 'Subscription not found.' },
} as const

export const DELETE_SUBSCRIPTION_SUMMARY = 'Delete subscription'
export const DELETE_SUBSCRIPTION_DESCRIPTION =
  'Deletes a subscription. **Admin only**.'

export const DELETE_SUBSCRIPTION_RESPONSES = {
  401: { description: 'Missing or invalid internal key.' },
  403: { description: 'Caller is not an admin.' },
  404: { description: 'Subscription not found.' },
} as const

export const CREATE_SUBSCRIPTION_ITEM_SUMMARY = 'Create subscription item'
export const CREATE_SUBSCRIPTION_ITEM_DESCRIPTION =
  'Adds a price line item to a subscription. **Admin only**.'

export const CREATE_SUBSCRIPTION_ITEM_RESPONSES = {
  401: { description: 'Missing or invalid internal key.' },
  403: { description: 'Caller is not an admin.' },
  404: { description: 'Subscription or price not found.' },
} as const

export const UPDATE_SUBSCRIPTION_ITEM_SUMMARY = 'Update subscription item'
export const UPDATE_SUBSCRIPTION_ITEM_DESCRIPTION =
  'Updates a subscription line item. **Admin only**.'

export const UPDATE_SUBSCRIPTION_ITEM_RESPONSES = {
  401: { description: 'Missing or invalid internal key.' },
  403: { description: 'Caller is not an admin.' },
  404: { description: 'Subscription item or price not found.' },
} as const

export const DELETE_SUBSCRIPTION_ITEM_SUMMARY = 'Delete subscription item'
export const DELETE_SUBSCRIPTION_ITEM_DESCRIPTION =
  'Removes a line item from a subscription. **Admin only**.'

export const DELETE_SUBSCRIPTION_ITEM_RESPONSES = {
  401: { description: 'Missing or invalid internal key.' },
  403: { description: 'Caller is not an admin.' },
  404: { description: 'Subscription item not found.' },
} as const
