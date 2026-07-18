import { Request } from '../request'
import type { Runtime } from '../runtime'
import {
  InvoiceCreatedSchema,
  ProrationPreviewSchema,
  SubscriptionCreatedSchema,
  SubscriptionChargeCreatedSchema,
  SubscriptionChargeMutationResultSchema,
  SubscriptionDiscountCreatedSchema,
  SubscriptionDiscountMutationResultSchema,
  SubscriptionMutationResultSchema,
  SubscriptionPreferencesSchema,
  SubscriptionPreferencesUpdatedSchema,
  SubscriptionBulkUpdateResultSchema,
  SubscriptionCustomViewListSchema,
  SubscriptionViewMutationResultSchema,
  UpcomingInvoiceSchema,
} from '../schemas'
import type {
  InvoiceCreated,
  ProrationPreview,
  RequestOptions,
  SubscriptionCreated,
  SubscriptionAmendmentCreateParams,
  SubscriptionCancelParams,
  SubscriptionChargeCreateParams,
  SubscriptionChargeCreated,
  SubscriptionChargeMutationResult,
  SubscriptionCreateParams,
  SubscriptionDiscountCreateParams,
  SubscriptionDiscountCreated,
  SubscriptionDiscountMutationResult,
  SubscriptionExtendParams,
  SubscriptionMutationResult,
  SubscriptionPreferenceUpdateParams,
  SubscriptionPreferences,
  SubscriptionPreferencesUpdated,
  SubscriptionBulkInvoiceModeParams,
  SubscriptionBulkUpdateResult,
  SubscriptionCustomView,
  SubscriptionCustomViewCreateParams,
  SubscriptionViewMutationResult,
  List,
  SubscriptionManualInvoiceParams,
  SubscriptionPauseParams,
  SubscriptionProrationPreviewParams,
  SubscriptionReactivateParams,
  SubscriptionResumeParams,
  UpcomingInvoice,
} from '../types'

/** `$billing.subscriptions.*` — tenant-scoped subscription operations. */
export function createSubscriptionsResource(runtime: Runtime) {
  const action = (
    subscriptionId: string,
    name: string,
    body: unknown,
    options?: RequestOptions
  ) =>
    Request<SubscriptionMutationResult>(
      runtime,
      {
        method: 'POST',
        path: `/api/v1/subscriptions/${encodeURIComponent(subscriptionId)}/${name}`,
        body,
        signal: options?.signal,
      },
      SubscriptionMutationResultSchema
    )

  return {
    /** Creates a commercial subscription in the active Billing workspace. */
    create(params: SubscriptionCreateParams, options?: RequestOptions) {
      return Request<SubscriptionCreated>(
        runtime,
        {
          method: 'POST',
          path: '/api/v1/subscriptions',
          body: params,
          signal: options?.signal,
        },
        SubscriptionCreatedSchema
      )
    },
    /** Idempotently invoices the subscription when its period is due. */
    bill(subscriptionId: string, options?: RequestOptions) {
      return Request<InvoiceCreated>(
        runtime,
        {
          method: 'POST',
          path: `/api/v1/subscriptions/${encodeURIComponent(subscriptionId)}/bill`,
          signal: options?.signal,
        },
        InvoiceCreatedSchema
      )
    },
    /** Generates the current future period as an advance invoice. */
    generateAdvanceInvoice(
      subscriptionId: string,
      params: Omit<SubscriptionManualInvoiceParams, 'advance'> = {},
      options?: RequestOptions
    ) {
      return Request<InvoiceCreated>(
        runtime,
        {
          method: 'POST',
          path: `/api/v1/subscriptions/${encodeURIComponent(subscriptionId)}/bill`,
          body: { ...params, advance: true },
          signal: options?.signal,
        },
        InvoiceCreatedSchema
      )
    },
    /** Previews the next invoice without posting financial data. */
    upcomingInvoice(subscriptionId: string, options?: RequestOptions) {
      return Request<UpcomingInvoice>(
        runtime,
        {
          method: 'GET',
          path: `/api/v1/subscriptions/${encodeURIComponent(subscriptionId)}/upcoming-invoice`,
          signal: options?.signal,
        },
        UpcomingInvoiceSchema
      )
    },
    /** Previews a time-weighted mid-period item change. */
    previewProration(
      subscriptionId: string,
      params: SubscriptionProrationPreviewParams,
      options?: RequestOptions
    ) {
      return Request<ProrationPreview>(
        runtime,
        {
          method: 'POST',
          path: `/api/v1/subscriptions/${encodeURIComponent(subscriptionId)}/preview-proration`,
          body: params,
          signal: options?.signal,
        },
        ProrationPreviewSchema
      )
    },
    /** Pauses a subscription now, at renewal, or on a scheduled date. */
    pause(
      subscriptionId: string,
      params: SubscriptionPauseParams,
      options?: RequestOptions
    ) {
      return action(subscriptionId, 'pause', params, options)
    },
    /** Resumes paused service while preserving or resetting its billing period. */
    resume(
      subscriptionId: string,
      params: SubscriptionResumeParams,
      options?: RequestOptions
    ) {
      return action(subscriptionId, 'resume', params, options)
    },
    /** Cancels a subscription immediately, at renewal, or on a future date. */
    cancel(
      subscriptionId: string,
      params: SubscriptionCancelParams,
      options?: RequestOptions
    ) {
      return action(subscriptionId, 'cancel', params, options)
    },
    /** Reactivates a pending cancellation or creates a successor agreement. */
    reactivate(
      subscriptionId: string,
      params: SubscriptionReactivateParams = {},
      options?: RequestOptions
    ) {
      return action(subscriptionId, 'reactivate', params, options)
    },
    /** Extends a fixed-cycle subscription. */
    extend(
      subscriptionId: string,
      params: SubscriptionExtendParams,
      options?: RequestOptions
    ) {
      return action(subscriptionId, 'extend', params, options)
    },
    amendments: {
      /** Schedules or immediately applies a composition and terms amendment. */
      create(
        subscriptionId: string,
        params: SubscriptionAmendmentCreateParams,
        options?: RequestOptions
      ) {
        return action(subscriptionId, 'amendments', params, options)
      },
    },
    charges: {
      /** Adds a one-time charge to the next or an immediate invoice. */
      create(
        subscriptionId: string,
        params: SubscriptionChargeCreateParams,
        options?: RequestOptions
      ) {
        return Request<SubscriptionChargeCreated>(
          runtime,
          {
            method: 'POST',
            path: `/api/v1/subscriptions/${encodeURIComponent(subscriptionId)}/charges`,
            body: params,
            signal: options?.signal,
          },
          SubscriptionChargeCreatedSchema
        )
      },
      /** Voids an unbilled charge without removing its audit history. */
      void(subscriptionId: string, chargeId: string, options?: RequestOptions) {
        return Request<SubscriptionChargeMutationResult>(
          runtime,
          {
            method: 'DELETE',
            path: `/api/v1/subscriptions/${encodeURIComponent(subscriptionId)}/charges/${encodeURIComponent(chargeId)}`,
            signal: options?.signal,
          },
          SubscriptionChargeMutationResultSchema
        )
      },
    },
    discounts: {
      /** Applies a promotion code or a direct recurring discount. */
      create(
        subscriptionId: string,
        params: SubscriptionDiscountCreateParams,
        options?: RequestOptions
      ) {
        return Request<SubscriptionDiscountCreated>(
          runtime,
          {
            method: 'POST',
            path: `/api/v1/subscriptions/${encodeURIComponent(subscriptionId)}/discounts`,
            body: params,
            signal: options?.signal,
          },
          SubscriptionDiscountCreatedSchema
        )
      },
      /** Ends an active discount while retaining its redemption history. */
      remove(
        subscriptionId: string,
        discountId: string,
        options?: RequestOptions
      ) {
        return Request<SubscriptionDiscountMutationResult>(
          runtime,
          {
            method: 'DELETE',
            path: `/api/v1/subscriptions/${encodeURIComponent(subscriptionId)}/discounts/${encodeURIComponent(discountId)}`,
            signal: options?.signal,
          },
          SubscriptionDiscountMutationResultSchema
        )
      },
    },
    preferences: {
      /** Retrieves workspace defaults for subscription billing behavior. */
      retrieve(options?: RequestOptions) {
        return Request<SubscriptionPreferences>(
          runtime,
          {
            method: 'GET',
            path: '/api/v1/subscription-preferences',
            signal: options?.signal,
          },
          SubscriptionPreferencesSchema
        )
      },
      /** Atomically replaces workspace subscription defaults and child rules. */
      update(
        params: SubscriptionPreferenceUpdateParams,
        options?: RequestOptions
      ) {
        return Request<SubscriptionPreferencesUpdated>(
          runtime,
          {
            method: 'PATCH',
            path: '/api/v1/subscription-preferences',
            body: params,
            signal: options?.signal,
          },
          SubscriptionPreferencesUpdatedSchema
        )
      },
      /** Updates draft/finalization overrides for a bounded subscription set. */
      bulkUpdateInvoiceModes(
        params: SubscriptionBulkInvoiceModeParams,
        options?: RequestOptions
      ) {
        return Request<SubscriptionBulkUpdateResult>(
          runtime,
          {
            method: 'PATCH',
            path: '/api/v1/subscription-preferences/invoice-modes',
            body: params,
            signal: options?.signal,
          },
          SubscriptionBulkUpdateResultSchema
        )
      },
    },
    views: {
      /** Lists tenant-visible and caller-owned saved subscription views. */
      list(options?: RequestOptions) {
        return Request<List<SubscriptionCustomView>>(
          runtime,
          {
            method: 'GET',
            path: '/api/v1/subscription-views',
            signal: options?.signal,
          },
          SubscriptionCustomViewListSchema
        )
      },
      /** Creates a reusable server-side subscription view. */
      create(
        params: SubscriptionCustomViewCreateParams,
        options?: RequestOptions
      ) {
        return Request<SubscriptionViewMutationResult>(
          runtime,
          {
            method: 'POST',
            path: '/api/v1/subscription-views',
            body: params,
            signal: options?.signal,
          },
          SubscriptionViewMutationResultSchema
        )
      },
      /** Replaces a caller-owned saved subscription view. */
      update(
        viewId: string,
        params: SubscriptionCustomViewCreateParams,
        options?: RequestOptions
      ) {
        return Request<SubscriptionViewMutationResult>(
          runtime,
          {
            method: 'PUT',
            path: `/api/v1/subscription-views/${encodeURIComponent(viewId)}`,
            body: params,
            signal: options?.signal,
          },
          SubscriptionViewMutationResultSchema
        )
      },
      /** Deletes a caller-owned saved subscription view. */
      delete(viewId: string, options?: RequestOptions) {
        return Request<SubscriptionViewMutationResult>(
          runtime,
          {
            method: 'DELETE',
            path: `/api/v1/subscription-views/${encodeURIComponent(viewId)}`,
            signal: options?.signal,
          },
          SubscriptionViewMutationResultSchema
        )
      },
    },
    /** Soft-deletes a subscription while preserving its financial history. */
    delete(subscriptionId: string, options?: RequestOptions) {
      return Request<SubscriptionMutationResult>(
        runtime,
        {
          method: 'DELETE',
          path: `/api/v1/subscriptions/${encodeURIComponent(subscriptionId)}`,
          signal: options?.signal,
        },
        SubscriptionMutationResultSchema
      )
    },
  }
}
