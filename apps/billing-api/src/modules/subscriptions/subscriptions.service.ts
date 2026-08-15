import { AppHttpError } from '@/http/errors'

import { createAmendment } from './repositories/amendments'
import { billSubscription } from './repositories/bill'
import { createCharge, listCharges, voidCharge } from './repositories/charges'
import { create } from './repositories/create'
import {
  createDiscount,
  listDiscounts,
  removeDiscount,
} from './repositories/discounts'
import { ensureForCustomer } from './repositories/ensure'
import {
  cancel,
  extend,
  pause,
  reactivate,
  remove,
  resume,
} from './repositories/lifecycle'
import { listSubscriptions } from './repositories/list'
import {
  retrievePreferences,
  updateInvoiceModes,
  updatePreferences,
} from './repositories/preferences'
import { previewProration } from './repositories/preview-proration'
import { previewUpcomingInvoice } from './repositories/preview'
import {
  createView,
  deleteView,
  listViews,
  updateView,
} from './repositories/views'
import type { ServiceResult } from './schemas/api'
import type {
  SubscriptionAmendmentCreateParams,
  SubscriptionBulkInvoiceModeParams,
  SubscriptionCancelParams,
  SubscriptionChargeCreateParams,
  SubscriptionCreateServiceParams,
  SubscriptionCustomViewCreateParams,
  SubscriptionDiscountCreateParams,
  SubscriptionExtendParams,
  SubscriptionListParams,
  SubscriptionManualInvoiceParams,
  SubscriptionPauseParams,
  SubscriptionPreferenceUpdateParams,
  SubscriptionProrationPreviewParams,
  SubscriptionReactivateParams,
  SubscriptionResumeParams,
} from './schemas/subscription'
import type { SubscriptionEnsureParams } from './schemas/sync'
import {
  resourceList,
  serializeResource,
  subscriptionList,
} from './subscriptions.serializers'

async function unwrap<T>(
  result: Awaited<ServiceResult<T>>,
  kind = 'subscription'
): Promise<T> {
  if (result.error === null) return result.data

  const status = result.status ?? 500
  throw new AppHttpError({
    code:
      status === 404
        ? `${kind}/not-found`
        : status === 409
          ? `${kind}/conflict`
          : status === 422
            ? 'validation/invalid-request'
            : 'internal/error',
    message: result.error,
    httpStatus: status,
  })
}

export const subscriptionsService = {
  async list(
    tenantId: string,
    params: SubscriptionListParams,
    ownerUserId?: string,
    sourceAppId?: string,
    url = '/api/v1/subscriptions'
  ) {
    return subscriptionList(
      await listSubscriptions(tenantId, params, ownerUserId, sourceAppId),
      url
    )
  },
  async create(tenantId: string, body: SubscriptionCreateServiceParams) {
    return serializeResource(
      await unwrap(await create(tenantId, { ...body, sourceAppId: null })),
      'subscription'
    )
  },
  async remove(tenantId: string, id: string) {
    return {
      ...(serializeResource(
        await unwrap(await remove(tenantId, id)),
        'subscription'
      ) as Record<string, unknown>),
      deleted: true,
    }
  },
  async amend(
    tenantId: string,
    id: string,
    body: SubscriptionAmendmentCreateParams
  ) {
    return serializeResource(
      await unwrap(await createAmendment(tenantId, id, body)),
      'subscription_amendment'
    )
  },
  async bill(
    tenantId: string,
    id: string,
    body: SubscriptionManualInvoiceParams
  ) {
    const result = await billSubscription(tenantId, id, undefined, {
      advance: body.advance,
      forceAdvance: body.advance,
      ...(body.draft ? { invoiceModeOverride: 'DRAFT' as const } : {}),
    })
    if (!result.invoiceId)
      throw new AppHttpError({
        code: 'subscription/not-due',
        message: 'The subscription does not have an invoice due.',
        httpStatus: 409,
      })

    return { object: 'invoice' as const, id: result.invoiceId }
  },
  async pause(tenantId: string, id: string, body: SubscriptionPauseParams) {
    return serializeResource(
      await unwrap(await pause(tenantId, id, body)),
      'subscription_schedule'
    )
  },
  async resume(tenantId: string, id: string, body: SubscriptionResumeParams) {
    return serializeResource(
      await unwrap(await resume(tenantId, id, body)),
      'subscription_schedule'
    )
  },
  async cancel(tenantId: string, id: string, body: SubscriptionCancelParams) {
    return serializeResource(
      await unwrap(await cancel(tenantId, id, body)),
      'subscription_schedule'
    )
  },
  async reactivate(
    tenantId: string,
    id: string,
    body: SubscriptionReactivateParams
  ) {
    return serializeResource(
      await unwrap(await reactivate(tenantId, id, body)),
      'subscription'
    )
  },
  async extend(tenantId: string, id: string, body: SubscriptionExtendParams) {
    return serializeResource(
      await unwrap(await extend(tenantId, id, body)),
      'subscription'
    )
  },
  async previewProration(
    tenantId: string,
    id: string,
    body: SubscriptionProrationPreviewParams
  ) {
    return {
      ...(serializeResource(
        await previewProration(tenantId, id, body),
        'proration_preview'
      ) as Record<string, unknown>),
      id,
    }
  },
  async upcomingInvoice(tenantId: string, id: string) {
    return {
      ...(serializeResource(
        await previewUpcomingInvoice(tenantId, id),
        'upcoming_invoice'
      ) as Record<string, unknown>),
      id,
    }
  },
  async listCharges(tenantId: string, id: string) {
    return resourceList(
      await listCharges(tenantId, id),
      'subscription_charge',
      `/api/v1/subscriptions/${id}/charges`
    )
  },
  async createCharge(
    tenantId: string,
    id: string,
    body: SubscriptionChargeCreateParams
  ) {
    return serializeResource(
      await unwrap(
        await createCharge(tenantId, id, body),
        'subscription_charge'
      ),
      'subscription_charge'
    )
  },
  async voidCharge(tenantId: string, id: string, chargeId: string) {
    return {
      ...(serializeResource(
        await unwrap(
          await voidCharge(tenantId, id, chargeId),
          'subscription_charge'
        ),
        'subscription_charge'
      ) as Record<string, unknown>),
      deleted: true,
    }
  },
  async listDiscounts(tenantId: string, id: string) {
    return resourceList(
      await listDiscounts(tenantId, id),
      'subscription_discount',
      `/api/v1/subscriptions/${id}/discounts`
    )
  },
  async createDiscount(
    tenantId: string,
    id: string,
    body: SubscriptionDiscountCreateParams
  ) {
    return serializeResource(
      await unwrap(
        await createDiscount(tenantId, id, body),
        'subscription_discount'
      ),
      'subscription_discount'
    )
  },
  async removeDiscount(tenantId: string, id: string, discountId: string) {
    return {
      ...(serializeResource(
        await unwrap(
          await removeDiscount(tenantId, id, discountId),
          'subscription_discount'
        ),
        'subscription_discount'
      ) as Record<string, unknown>),
      deleted: true,
    }
  },
  async preferences(tenantId: string) {
    return {
      ...(serializeResource(
        await retrievePreferences(tenantId),
        'subscription_preferences'
      ) as Record<string, unknown>),
      id: tenantId,
    }
  },
  async updatePreferences(
    tenantId: string,
    body: SubscriptionPreferenceUpdateParams
  ) {
    return {
      ...(serializeResource(
        await unwrap(
          await updatePreferences(tenantId, body),
          'subscription_preferences'
        ),
        'subscription_preferences'
      ) as Record<string, unknown>),
      id: tenantId,
    }
  },
  async updateInvoiceModes(
    tenantId: string,
    body: SubscriptionBulkInvoiceModeParams
  ) {
    return {
      ...(serializeResource(
        await unwrap(await updateInvoiceModes(tenantId, body), 'subscription'),
        'subscription_bulk_update'
      ) as Record<string, unknown>),
      id: tenantId,
    }
  },
  async listViews(tenantId: string, ownerUserId?: string) {
    return resourceList(
      await listViews(tenantId, ownerUserId),
      'subscription_view',
      '/api/v1/subscription-views'
    )
  },
  async createView(
    tenantId: string,
    body: SubscriptionCustomViewCreateParams,
    ownerUserId?: string
  ) {
    return serializeResource(
      await unwrap(
        await createView(tenantId, body, ownerUserId),
        'subscription_view'
      ),
      'subscription_view'
    )
  },
  async updateView(
    tenantId: string,
    id: string,
    body: SubscriptionCustomViewCreateParams,
    ownerUserId?: string
  ) {
    return serializeResource(
      await unwrap(
        await updateView(tenantId, id, body, ownerUserId),
        'subscription_view'
      ),
      'subscription_view'
    )
  },
  async deleteView(tenantId: string, id: string, ownerUserId?: string) {
    return {
      ...(serializeResource(
        await unwrap(
          await deleteView(tenantId, id, ownerUserId),
          'subscription_view'
        ),
        'subscription_view'
      ) as Record<string, unknown>),
      deleted: true,
    }
  },
  async ensure(body: SubscriptionEnsureParams) {
    return serializeResource(
      await unwrap(await ensureForCustomer(body)),
      'subscription'
    )
  },
}
