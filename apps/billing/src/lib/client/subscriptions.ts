import type {
  SubscriptionAmendmentCreateParams,
  SubscriptionBulkInvoiceModeParams,
  SubscriptionBulkUpdateResult,
  SubscriptionCancelParams,
  SubscriptionChargeCreateInput,
  SubscriptionChargeCreated,
  SubscriptionChargeMutationResult,
  SubscriptionCreated,
  SubscriptionCreateInput,
  SubscriptionDiscountCreateInput,
  SubscriptionDiscountCreated,
  SubscriptionDiscountMutationResult,
  SubscriptionExtendParams,
  SubscriptionMutationResult,
  SubscriptionManualInvoiceParams,
  SubscriptionPauseParams,
  SubscriptionPreferenceUpdateInput,
  SubscriptionPreferenceUpdated,
  SubscriptionReactivateParams,
  SubscriptionResumeParams,
  SubscriptionCustomViewCreateParams,
  SubscriptionViewMutationResult,
} from '@/types/subscription'

import { request } from './request'

export const create = (params: SubscriptionCreateInput) =>
  request<SubscriptionCreated>('/api/v1/subscriptions', {
    method: 'POST',
    body: JSON.stringify(params),
  })

const action = <T>(subscriptionId: string, name: string, params: T) =>
  request<SubscriptionMutationResult>(
    `/api/v1/subscriptions/${encodeURIComponent(subscriptionId)}/${name}`,
    { method: 'POST', body: JSON.stringify(params) }
  )

export const pause = (id: string, params: SubscriptionPauseParams) =>
  action(id, 'pause', params)
export const resume = (id: string, params: SubscriptionResumeParams) =>
  action(id, 'resume', params)
export const cancel = (id: string, params: SubscriptionCancelParams) =>
  action(id, 'cancel', params)
export const reactivate = (id: string, params: SubscriptionReactivateParams) =>
  action(id, 'reactivate', params)
export const extend = (id: string, params: SubscriptionExtendParams) =>
  action(id, 'extend', params)
export const createAmendment = (
  id: string,
  params: SubscriptionAmendmentCreateParams
) => action(id, 'amendments', params)
export const createCharge = (
  id: string,
  params: SubscriptionChargeCreateInput
) =>
  request<SubscriptionChargeCreated>(
    `/api/v1/subscriptions/${encodeURIComponent(id)}/charges`,
    { method: 'POST', body: JSON.stringify(params) }
  )
export const createDiscount = (
  id: string,
  params: SubscriptionDiscountCreateInput
) =>
  request<SubscriptionDiscountCreated>(
    `/api/v1/subscriptions/${encodeURIComponent(id)}/discounts`,
    { method: 'POST', body: JSON.stringify(params) }
  )
export const voidCharge = (subscriptionId: string, chargeId: string) =>
  request<SubscriptionChargeMutationResult>(
    `/api/v1/subscriptions/${encodeURIComponent(subscriptionId)}/charges/${encodeURIComponent(chargeId)}`,
    { method: 'DELETE' }
  )
export const removeDiscount = (subscriptionId: string, discountId: string) =>
  request<SubscriptionDiscountMutationResult>(
    `/api/v1/subscriptions/${encodeURIComponent(subscriptionId)}/discounts/${encodeURIComponent(discountId)}`,
    { method: 'DELETE' }
  )
export const deleteSubscription = (id: string) =>
  request<SubscriptionMutationResult>(
    `/api/v1/subscriptions/${encodeURIComponent(id)}`,
    { method: 'DELETE' }
  )
export const generateInvoice = (
  id: string,
  params: SubscriptionManualInvoiceParams
) =>
  request<{ object: 'invoice'; id: string }>(
    `/api/v1/subscriptions/${encodeURIComponent(id)}/bill`,
    { method: 'POST', body: JSON.stringify(params) }
  )
export const bulkUpdateInvoiceMode = (
  params: SubscriptionBulkInvoiceModeParams
) =>
  request<SubscriptionBulkUpdateResult>(
    '/api/v1/subscription-preferences/invoice-modes',
    { method: 'PATCH', body: JSON.stringify(params) }
  )

export const updatePreferences = (params: SubscriptionPreferenceUpdateInput) =>
  request<SubscriptionPreferenceUpdated>('/api/v1/subscription-preferences', {
    method: 'PATCH',
    body: JSON.stringify(params),
  })
export const createView = (params: SubscriptionCustomViewCreateParams) =>
  request<SubscriptionViewMutationResult>('/api/v1/subscription-views', {
    method: 'POST',
    body: JSON.stringify(params),
  })
export const updateView = (
  id: string,
  params: SubscriptionCustomViewCreateParams
) =>
  request<SubscriptionViewMutationResult>(
    `/api/v1/subscription-views/${encodeURIComponent(id)}`,
    { method: 'PUT', body: JSON.stringify(params) }
  )
export const deleteView = (id: string) =>
  request<SubscriptionViewMutationResult>(
    `/api/v1/subscription-views/${encodeURIComponent(id)}`,
    { method: 'DELETE' }
  )

export const subscriptions = {
  bulkUpdateInvoiceMode,
  cancel,
  create,
  createAmendment,
  createCharge,
  createDiscount,
  createView,
  delete: deleteSubscription,
  deleteView,
  extend,
  generateInvoice,
  pause,
  reactivate,
  removeDiscount,
  resume,
  updatePreferences,
  updateView,
  voidCharge,
}
