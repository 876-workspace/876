import { Router } from 'express'
import { z } from 'zod'

import { createApiRouter, type GuardResolver } from '@/http/api-router'
import { errorEnvelopeSchema, successEnvelopeSchema } from '@/http/envelope'

import {
  SubscriptionAmendmentCreateSchema,
  SubscriptionBulkInvoiceModeSchema,
  SubscriptionCancelSchema,
  SubscriptionChargeCreateSchema,
  SubscriptionCreateSchema,
  SubscriptionCustomViewCreateSchema,
  SubscriptionDiscountCreateSchema,
  SubscriptionExtendSchema,
  SubscriptionManualInvoiceSchema,
  SubscriptionPauseSchema,
  SubscriptionPreferenceUpdateSchema,
  SubscriptionProrationPreviewSchema,
  SubscriptionReactivateSchema,
  SubscriptionResumeSchema,
  SubscriptionStatusSchema,
} from './schemas/subscription'
import { SubscriptionEnsureSchema } from './schemas/sync'
import { subscriptionsController as controller } from './subscriptions.controller'

const resource = (name: string) =>
  z.object({ object: z.literal(name) }).passthrough()
const list = (name: string) =>
  z.strictObject({
    object: z.literal('list'),
    data: z.array(resource(name)),
    has_more: z.boolean(),
    total_count: z.number().int().nullable(),
    url: z.string(),
  })
const errors = {
  '4XX': { description: 'Client Error', schema: errorEnvelopeSchema },
}
const subscription = z.strictObject({ subscriptionId: z.string().min(1) })
const charge = subscription.extend({ chargeId: z.string().min(1) })
const discount = subscription.extend({ discountId: z.string().min(1) })
const view = z.strictObject({ viewId: z.string().min(1) })
const organization = z.strictObject({ organizationId: z.string().min(1) })
const query = z.strictObject({
  status: SubscriptionStatusSchema.optional(),
  customerId: z.string().min(1).optional(),
  customViewId: z.string().min(1).optional(),
})

export function createSubscriptionsRouter(resolveGuards: GuardResolver) {
  const api = createApiRouter({ tag: 'Subscriptions', resolveGuards })
  const billingApi = createApiRouter({ tag: 'Billing', resolveGuards })
  const adminApi = createApiRouter({ tag: 'Admin sync', resolveGuards })
  const read = {
    kind: 'tenant' as const,
    permission: 'subscriptions:read',
  }
  const write = {
    kind: 'tenant' as const,
    permission: 'subscriptions:write',
  }
  const response = (name: string, description = 'Successful Response') => ({
    200: { description, schema: successEnvelopeSchema(resource(name)) },
    ...errors,
  })

  billingApi.get({
    path: '/subscriptions',
    summary: 'Billing GET /subscriptions',
    description: 'Ported from `src/app/api/billing/subscriptions/route.ts`.',
    operationId: 'billing-billing_get_subscriptions',
    security: read,
    request: { query },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(list('subscription')),
      },
      422: { description: 'Validation Error', schema: errorEnvelopeSchema },
    },
    handler: controller.list,
  })
  api.post({
    path: '/subscriptions',
    summary: 'Create a commercial subscription',
    security: write,
    request: { body: SubscriptionCreateSchema },
    responses: {
      201: {
        description: 'Created',
        schema: successEnvelopeSchema(resource('subscription')),
      },
      ...errors,
    },
    handler: controller.create,
  })
  api.delete({
    path: '/subscriptions/:subscriptionId',
    summary: 'Soft-delete a subscription while retaining financial history',
    security: write,
    request: { params: subscription },
    responses: response('subscription'),
    handler: controller.remove,
  })
  api.post({
    path: '/subscriptions/:subscriptionId/amendments',
    summary: 'Apply or schedule a subscription composition and terms change',
    security: write,
    request: { params: subscription, body: SubscriptionAmendmentCreateSchema },
    responses: response('subscription_amendment'),
    handler: controller.amend,
  })
  api.post({
    path: '/subscriptions/:subscriptionId/bill',
    summary: 'Idempotently invoice a due subscription period',
    security: write,
    request: { params: subscription, body: SubscriptionManualInvoiceSchema },
    responses: response('invoice'),
    handler: controller.bill,
  })
  api.post({
    path: '/subscriptions/:subscriptionId/cancel',
    summary: 'Cancel a subscription now, at renewal, or on a future date',
    security: write,
    request: { params: subscription, body: SubscriptionCancelSchema },
    responses: response('subscription_schedule'),
    handler: controller.cancel,
  })
  api.post({
    path: '/subscriptions/:subscriptionId/extend',
    summary: 'Extend the remaining subscription term',
    security: write,
    request: { params: subscription, body: SubscriptionExtendSchema },
    responses: response('subscription'),
    handler: controller.extend,
  })
  api.post({
    path: '/subscriptions/:subscriptionId/pause',
    summary: 'Pause a subscription now or on a future date',
    security: write,
    request: { params: subscription, body: SubscriptionPauseSchema },
    responses: response('subscription_schedule'),
    handler: controller.pause,
  })
  api.post({
    path: '/subscriptions/:subscriptionId/preview-proration',
    summary: 'Preview a mid-period subscription item change',
    security: read,
    request: { params: subscription, body: SubscriptionProrationPreviewSchema },
    responses: response('proration_preview'),
    handler: controller.previewProration,
  })
  api.post({
    path: '/subscriptions/:subscriptionId/reactivate',
    summary: 'Reactivate a cancellation or create a successor subscription',
    security: write,
    request: { params: subscription, body: SubscriptionReactivateSchema },
    responses: response('subscription'),
    handler: controller.reactivate,
  })
  api.post({
    path: '/subscriptions/:subscriptionId/resume',
    summary: 'Resume a paused subscription',
    security: write,
    request: { params: subscription, body: SubscriptionResumeSchema },
    responses: response('subscription_schedule'),
    handler: controller.resume,
  })
  api.get({
    path: '/subscriptions/:subscriptionId/upcoming-invoice',
    summary: 'Preview the next subscription invoice',
    security: read,
    request: { params: subscription },
    responses: response('upcoming_invoice'),
    handler: controller.upcomingInvoice,
  })
  api.get({
    path: '/subscriptions/:subscriptionId/charges',
    summary: 'List one-time charges for a subscription',
    security: read,
    request: { params: subscription },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(list('subscription_charge')),
      },
      ...errors,
    },
    handler: controller.chargesList,
  })
  api.post({
    path: '/subscriptions/:subscriptionId/charges',
    summary: 'Add a one-time subscription charge',
    security: write,
    request: { params: subscription, body: SubscriptionChargeCreateSchema },
    responses: response('subscription_charge'),
    handler: controller.chargesCreate,
  })
  api.delete({
    path: '/subscriptions/:subscriptionId/charges/:chargeId',
    summary: 'Void an unbilled subscription charge',
    security: write,
    request: { params: charge },
    responses: response('subscription_charge'),
    handler: controller.chargesVoid,
  })
  api.get({
    path: '/subscriptions/:subscriptionId/discounts',
    summary: 'List discounts applied to a subscription',
    security: read,
    request: { params: subscription },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(list('subscription_discount')),
      },
      ...errors,
    },
    handler: controller.discountsList,
  })
  api.post({
    path: '/subscriptions/:subscriptionId/discounts',
    summary: 'Apply a coupon or manual subscription discount',
    security: write,
    request: { params: subscription, body: SubscriptionDiscountCreateSchema },
    responses: response('subscription_discount'),
    handler: controller.discountsCreate,
  })
  api.delete({
    path: '/subscriptions/:subscriptionId/discounts/:discountId',
    summary: 'End an active subscription discount',
    security: write,
    request: { params: discount },
    responses: response('subscription_discount'),
    handler: controller.discountsRemove,
  })
  api.get({
    path: '/subscription-preferences',
    summary: 'Retrieve subscription defaults and automation settings',
    security: read,
    responses: response('subscription_preferences'),
    handler: controller.preferences,
  })
  api.patch({
    path: '/subscription-preferences',
    summary: 'Update subscription defaults and automation settings',
    security: write,
    request: { body: SubscriptionPreferenceUpdateSchema },
    responses: response('subscription_preferences'),
    handler: controller.updatePreferences,
  })
  api.patch({
    path: '/subscription-preferences/invoice-modes',
    summary: 'Bulk update per-subscription invoice modes',
    security: write,
    request: { body: SubscriptionBulkInvoiceModeSchema },
    responses: response('subscription_bulk_update'),
    handler: controller.updateInvoiceModes,
  })
  api.get({
    path: '/subscription-views',
    summary: 'List reusable subscription views',
    security: read,
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(list('subscription_view')),
      },
      ...errors,
    },
    handler: controller.viewsList,
  })
  api.post({
    path: '/subscription-views',
    summary: 'Create a reusable subscription view',
    security: write,
    request: { body: SubscriptionCustomViewCreateSchema },
    responses: {
      201: {
        description: 'Created',
        schema: successEnvelopeSchema(resource('subscription_view')),
      },
      ...errors,
    },
    handler: controller.viewsCreate,
  })
  api.put({
    path: '/subscription-views/:viewId',
    summary: 'Update a reusable subscription view',
    security: write,
    request: { params: view, body: SubscriptionCustomViewCreateSchema },
    responses: response('subscription_view'),
    handler: controller.viewsUpdate,
  })
  api.delete({
    path: '/subscription-views/:viewId',
    summary: 'Delete a reusable subscription view',
    security: write,
    request: { params: view },
    responses: response('subscription_view'),
    handler: controller.viewsDelete,
  })
  adminApi.post({
    path: '/admin/subscriptions/ensure',
    summary: 'Idempotently ensure a subscription',
    security: { kind: 'admin' },
    request: { body: SubscriptionEnsureSchema },
    responses: response('subscription'),
    handler: controller.ensure,
  })
  billingApi.get({
    path: '/integrations/organizations/:organizationId/subscriptions',
    summary:
      'Billing GET /integrations/organizations/{organizationId}/subscriptions',
    description:
      'Ported from `src/app/api/billing/integrations/organizations/[organizationId]/subscriptions/route.ts`.',
    operationId:
      'billing-billing_get_integrations_organizations_organizationId_subscriptions',
    security: { kind: 'integration', scope: 'billing.subscriptions.read' },
    request: { params: organization, query },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(list('subscription')),
      },
    },
    handler: controller.integrationList,
  })

  return Router().use(api.router, billingApi.router, adminApi.router)
}
