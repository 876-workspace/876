import type { Router } from 'express'
import { z } from 'zod'

import { createApiRouter, type GuardResolver } from '@/http/api-router'
import { listObjectSchema } from '@/http/envelope'

import * as controller from './billing.controller'
import * as docs from './billing.docs'
import {
  billingAccountCreateSchema,
  billingAccountIdParamsSchema,
  billingAccountUpdateSchema,
  billingAccountSchema,
  financeProvisioningDispatchSchema,
  financeProvisioningReconcileRequestSchema,
  financeProvisioningReconcileSchema,
  billingCustomerSyncDispatchSchema,
  billingCustomerSyncReconcileSchema,
  listBillingAccountsQuerySchema,
  listSubscriptionsQuerySchema,
  subscriptionCreateSchema,
  subscriptionIdParamsSchema,
  subscriptionItemCreateSchema,
  subscriptionItemParamsSchema,
  subscriptionItemUpdateSchema,
  subscriptionSchema,
  subscriptionUpdateSchema,
  subscriptionItemSchema,
} from './billing.schemas'

export function createBillingRouter(resolveGuards: GuardResolver): Router {
  const api = createApiRouter({
    tag: 'Billing',
    prefix: '/billing',
    security: 'admin',
    resolveGuards,
  })

  // Customer sync
  api.post({
    path: '/customer-sync/dispatch',
    operationId: 'billing-dispatch_billing_customer_sync',
    summary: docs.DISPATCH_BILLING_CUSTOMER_SYNC_SUMMARY,
    description: docs.DISPATCH_BILLING_CUSTOMER_SYNC_DESCRIPTION,
    responses: {
      200: {
        description: 'Dispatched.',
        schema: billingCustomerSyncDispatchSchema,
      },
      401: docs.DISPATCH_BILLING_CUSTOMER_SYNC_RESPONSES[401],
      403: docs.DISPATCH_BILLING_CUSTOMER_SYNC_RESPONSES[403],
    },
    handler: controller.dispatchBillingCustomerSync,
  })

  api.post({
    path: '/customer-sync/reconcile',
    operationId: 'billing-reconcile_billing_customer_sync',
    summary: docs.RECONCILE_BILLING_CUSTOMER_SYNC_SUMMARY,
    description: docs.RECONCILE_BILLING_CUSTOMER_SYNC_DESCRIPTION,
    responses: {
      200: {
        description: 'Reconciled.',
        schema: billingCustomerSyncReconcileSchema,
      },
      401: docs.RECONCILE_BILLING_CUSTOMER_SYNC_RESPONSES[401],
      403: docs.RECONCILE_BILLING_CUSTOMER_SYNC_RESPONSES[403],
    },
    handler: controller.reconcileBillingCustomerSync,
  })

  // Finance provisioning
  api.post({
    path: '/finance-provisioning/reconcile',
    operationId: 'billing-reconcile_finance_provisioning',
    summary: docs.RECONCILE_FINANCE_PROVISIONING_SUMMARY,
    description: docs.RECONCILE_FINANCE_PROVISIONING_DESCRIPTION,
    request: { body: financeProvisioningReconcileRequestSchema },
    responses: {
      200: {
        description: 'Reconciled.',
        schema: financeProvisioningReconcileSchema,
      },
      401: docs.RECONCILE_FINANCE_PROVISIONING_RESPONSES[401],
      403: docs.RECONCILE_FINANCE_PROVISIONING_RESPONSES[403],
    },
    handler: controller.reconcileFinanceProvisioning,
  })

  api.post({
    path: '/finance-provisioning/dispatch',
    operationId: 'billing-dispatch_finance_provisioning',
    summary: docs.DISPATCH_FINANCE_PROVISIONING_SUMMARY,
    description: docs.DISPATCH_FINANCE_PROVISIONING_DESCRIPTION,
    responses: {
      200: {
        description: 'Dispatched.',
        schema: financeProvisioningDispatchSchema,
      },
      401: docs.DISPATCH_FINANCE_PROVISIONING_RESPONSES[401],
      403: docs.DISPATCH_FINANCE_PROVISIONING_RESPONSES[403],
    },
    handler: controller.dispatchFinanceProvisioning,
  })

  // Billing accounts
  api.get({
    path: '/accounts',
    operationId: 'billing-list_billing_accounts',
    summary: docs.LIST_BILLING_ACCOUNTS_SUMMARY,
    description: docs.LIST_BILLING_ACCOUNTS_DESCRIPTION,
    request: { query: listBillingAccountsQuerySchema },
    responses: {
      200: {
        description: 'Accounts returned.',
        schema: listObjectSchema(billingAccountSchema),
      },
      401: docs.LIST_BILLING_ACCOUNTS_RESPONSES[401],
      403: docs.LIST_BILLING_ACCOUNTS_RESPONSES[403],
    },
    handler: controller.listBillingAccounts,
  })

  api.post({
    path: '/accounts',
    operationId: 'billing-create_billing_account',
    summary: docs.CREATE_BILLING_ACCOUNT_SUMMARY,
    description: docs.CREATE_BILLING_ACCOUNT_DESCRIPTION,
    request: { body: billingAccountCreateSchema },
    responses: {
      201: { description: 'Account created.', schema: billingAccountSchema },
      401: docs.CREATE_BILLING_ACCOUNT_RESPONSES[401],
      403: docs.CREATE_BILLING_ACCOUNT_RESPONSES[403],
    },
    handler: controller.createBillingAccount,
  })

  api.get({
    path: '/accounts/:account_id',
    operationId: 'billing-get_billing_account',
    summary: docs.RETRIEVE_BILLING_ACCOUNT_SUMMARY,
    description: docs.RETRIEVE_BILLING_ACCOUNT_DESCRIPTION,
    request: { params: billingAccountIdParamsSchema },
    responses: {
      200: { description: 'Account returned.', schema: billingAccountSchema },
      401: docs.RETRIEVE_BILLING_ACCOUNT_RESPONSES[401],
      403: docs.RETRIEVE_BILLING_ACCOUNT_RESPONSES[403],
      404: docs.RETRIEVE_BILLING_ACCOUNT_RESPONSES[404],
    },
    handler: controller.retrieveBillingAccount,
  })

  api.patch({
    path: '/accounts/:account_id',
    operationId: 'billing-update_billing_account',
    summary: docs.UPDATE_BILLING_ACCOUNT_SUMMARY,
    description: docs.UPDATE_BILLING_ACCOUNT_DESCRIPTION,
    request: {
      params: billingAccountIdParamsSchema,
      body: billingAccountUpdateSchema,
    },
    responses: {
      200: { description: 'Account updated.', schema: billingAccountSchema },
      401: docs.UPDATE_BILLING_ACCOUNT_RESPONSES[401],
      403: docs.UPDATE_BILLING_ACCOUNT_RESPONSES[403],
      404: docs.UPDATE_BILLING_ACCOUNT_RESPONSES[404],
    },
    handler: controller.updateBillingAccount,
  })

  api.delete({
    path: '/accounts/:account_id',
    operationId: 'billing-delete_billing_account',
    summary: docs.DELETE_BILLING_ACCOUNT_SUMMARY,
    description: docs.DELETE_BILLING_ACCOUNT_DESCRIPTION,
    request: { params: billingAccountIdParamsSchema },
    responses: {
      200: {
        description: 'Account deleted.',
        schema: z.object({
          object: z.literal('billing_account'),
          id: z.string(),
          deleted: z.literal(true),
        }),
      },
      401: docs.DELETE_BILLING_ACCOUNT_RESPONSES[401],
      403: docs.DELETE_BILLING_ACCOUNT_RESPONSES[403],
      404: docs.DELETE_BILLING_ACCOUNT_RESPONSES[404],
    },
    handler: controller.deleteBillingAccount,
  })

  // Subscriptions — literal sub-resources before :id already not needed; declare list/create before :id get
  api.get({
    path: '/subscriptions',
    operationId: 'billing-list_subscriptions',
    summary: docs.LIST_SUBSCRIPTIONS_SUMMARY,
    description: docs.LIST_SUBSCRIPTIONS_DESCRIPTION,
    request: { query: listSubscriptionsQuerySchema },
    responses: {
      200: {
        description: 'Subscriptions returned.',
        schema: listObjectSchema(subscriptionSchema),
      },
      401: docs.LIST_SUBSCRIPTIONS_RESPONSES[401],
      403: docs.LIST_SUBSCRIPTIONS_RESPONSES[403],
    },
    handler: controller.listSubscriptions,
  })

  api.post({
    path: '/subscriptions',
    operationId: 'billing-create_subscription',
    summary: docs.CREATE_SUBSCRIPTION_SUMMARY,
    description: docs.CREATE_SUBSCRIPTION_DESCRIPTION,
    request: { body: subscriptionCreateSchema },
    responses: {
      201: { description: 'Subscription created.', schema: subscriptionSchema },
      401: docs.CREATE_SUBSCRIPTION_RESPONSES[401],
      403: docs.CREATE_SUBSCRIPTION_RESPONSES[403],
      404: docs.CREATE_SUBSCRIPTION_RESPONSES[404],
    },
    handler: controller.createSubscription,
  })

  api.get({
    path: '/subscriptions/:subscription_id',
    operationId: 'billing-get_subscription',
    summary: docs.RETRIEVE_SUBSCRIPTION_SUMMARY,
    description: docs.RETRIEVE_SUBSCRIPTION_DESCRIPTION,
    request: { params: subscriptionIdParamsSchema },
    responses: {
      200: {
        description: 'Subscription returned.',
        schema: subscriptionSchema,
      },
      401: docs.RETRIEVE_SUBSCRIPTION_RESPONSES[401],
      403: docs.RETRIEVE_SUBSCRIPTION_RESPONSES[403],
      404: docs.RETRIEVE_SUBSCRIPTION_RESPONSES[404],
    },
    handler: controller.retrieveSubscription,
  })

  api.patch({
    path: '/subscriptions/:subscription_id',
    operationId: 'billing-update_subscription',
    summary: docs.UPDATE_SUBSCRIPTION_SUMMARY,
    description: docs.UPDATE_SUBSCRIPTION_DESCRIPTION,
    request: {
      params: subscriptionIdParamsSchema,
      body: subscriptionUpdateSchema,
    },
    responses: {
      200: { description: 'Subscription updated.', schema: subscriptionSchema },
      401: docs.UPDATE_SUBSCRIPTION_RESPONSES[401],
      403: docs.UPDATE_SUBSCRIPTION_RESPONSES[403],
      404: docs.UPDATE_SUBSCRIPTION_RESPONSES[404],
    },
    handler: controller.updateSubscription,
  })

  api.delete({
    path: '/subscriptions/:subscription_id',
    operationId: 'billing-delete_subscription',
    summary: docs.DELETE_SUBSCRIPTION_SUMMARY,
    description: docs.DELETE_SUBSCRIPTION_DESCRIPTION,
    request: { params: subscriptionIdParamsSchema },
    responses: {
      200: {
        description: 'Subscription deleted.',
        schema: z.object({
          object: z.literal('subscription'),
          id: z.string(),
          deleted: z.literal(true),
        }),
      },
      401: docs.DELETE_SUBSCRIPTION_RESPONSES[401],
      403: docs.DELETE_SUBSCRIPTION_RESPONSES[403],
      404: docs.DELETE_SUBSCRIPTION_RESPONSES[404],
    },
    handler: controller.deleteSubscription,
  })

  // Subscription items
  api.post({
    path: '/subscriptions/:subscription_id/items',
    operationId: 'billing-create_subscription_item',
    summary: docs.CREATE_SUBSCRIPTION_ITEM_SUMMARY,
    description: docs.CREATE_SUBSCRIPTION_ITEM_DESCRIPTION,
    request: {
      params: subscriptionIdParamsSchema,
      body: subscriptionItemCreateSchema,
    },
    responses: {
      201: { description: 'Item created.', schema: subscriptionItemSchema },
      401: docs.CREATE_SUBSCRIPTION_ITEM_RESPONSES[401],
      403: docs.CREATE_SUBSCRIPTION_ITEM_RESPONSES[403],
      404: docs.CREATE_SUBSCRIPTION_ITEM_RESPONSES[404],
    },
    handler: controller.createSubscriptionItem,
  })

  api.patch({
    path: '/subscriptions/:subscription_id/items/:item_id',
    operationId: 'billing-update_subscription_item',
    summary: docs.UPDATE_SUBSCRIPTION_ITEM_SUMMARY,
    description: docs.UPDATE_SUBSCRIPTION_ITEM_DESCRIPTION,
    request: {
      params: subscriptionItemParamsSchema,
      body: subscriptionItemUpdateSchema,
    },
    responses: {
      200: { description: 'Item updated.', schema: subscriptionItemSchema },
      401: docs.UPDATE_SUBSCRIPTION_ITEM_RESPONSES[401],
      403: docs.UPDATE_SUBSCRIPTION_ITEM_RESPONSES[403],
      404: docs.UPDATE_SUBSCRIPTION_ITEM_RESPONSES[404],
    },
    handler: controller.updateSubscriptionItem,
  })

  api.delete({
    path: '/subscriptions/:subscription_id/items/:item_id',
    operationId: 'billing-delete_subscription_item',
    summary: docs.DELETE_SUBSCRIPTION_ITEM_SUMMARY,
    description: docs.DELETE_SUBSCRIPTION_ITEM_DESCRIPTION,
    request: { params: subscriptionItemParamsSchema },
    responses: {
      200: {
        description: 'Item deleted.',
        schema: z.object({
          object: z.literal('subscription_item'),
          id: z.string(),
          deleted: z.literal(true),
        }),
      },
      401: docs.DELETE_SUBSCRIPTION_ITEM_RESPONSES[401],
      403: docs.DELETE_SUBSCRIPTION_ITEM_RESPONSES[403],
      404: docs.DELETE_SUBSCRIPTION_ITEM_RESPONSES[404],
    },
    handler: controller.deleteSubscriptionItem,
  })

  return api.router
}
