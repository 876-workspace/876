import {
  BillingPaymentListSchema,
  BillingPaymentSchema,
  DeletedBillingPaymentSchema,
} from '../schemas'
import { IntegrationRequest } from '../request'
import type { IntegrationRuntime } from '../runtime'
import type {
  BillingPayment,
  BillingPaymentCreateParams,
  BillingPaymentList,
  BillingPaymentUpdateParams,
  DeletedBillingPayment,
  IntegrationCreateOptions,
} from '../types'

function collectionPath(organizationId: string): string {
  return `/api/v1/integrations/organizations/${encodeURIComponent(organizationId)}/payments`
}

function resourcePath(organizationId: string, paymentId: string): string {
  return `${collectionPath(organizationId)}/${encodeURIComponent(paymentId)}`
}

/** `$876.billing.payments.*` — shared finance payment integrations. */
export function createIntegrationPaymentsResource(runtime: IntegrationRuntime) {
  return {
    list(organizationId: string) {
      return IntegrationRequest<BillingPaymentList>(
        runtime,
        { method: 'GET', path: collectionPath(organizationId) },
        BillingPaymentListSchema
      )
    },

    retrieve(organizationId: string, paymentId: string) {
      return IntegrationRequest<BillingPayment>(
        runtime,
        { method: 'GET', path: resourcePath(organizationId, paymentId) },
        BillingPaymentSchema
      )
    },

    create(
      organizationId: string,
      params: BillingPaymentCreateParams,
      options: IntegrationCreateOptions
    ) {
      return IntegrationRequest<BillingPayment>(
        runtime,
        {
          method: 'POST',
          path: collectionPath(organizationId),
          body: params,
          headers: { 'Idempotency-Key': options.idempotencyKey },
        },
        BillingPaymentSchema
      )
    },

    update(
      organizationId: string,
      paymentId: string,
      params: BillingPaymentUpdateParams
    ) {
      return IntegrationRequest<BillingPayment>(
        runtime,
        {
          method: 'PATCH',
          path: resourcePath(organizationId, paymentId),
          body: params,
        },
        BillingPaymentSchema
      )
    },

    delete(organizationId: string, paymentId: string) {
      return IntegrationRequest<DeletedBillingPayment>(
        runtime,
        { method: 'DELETE', path: resourcePath(organizationId, paymentId) },
        DeletedBillingPaymentSchema
      )
    },
  }
}
