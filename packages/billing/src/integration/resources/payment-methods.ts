import {
  DeletedPaymentMethodSchema,
  PaymentMethodListSchema,
  PaymentMethodSchema,
} from '../../schemas'
import type {
  DeletedPaymentMethod,
  PaymentMethod,
  PaymentMethodCreateParams,
  PaymentMethodList,
  PaymentMethodListParams,
  PaymentMethodUpdateParams,
} from '../../types'
import { IntegrationRequest } from '../request'
import type { IntegrationRuntime } from '../runtime'

function collectionPath(organizationId: string) {
  return `/api/v1/organizations/${encodeURIComponent(organizationId)}/payment-methods`
}

/** Server-only organization-scoped payment instrument integration. */
export function createIntegrationPaymentMethodsResource(
  runtime: IntegrationRuntime
) {
  return {
    list(organizationId: string, params: PaymentMethodListParams = {}) {
      return IntegrationRequest<PaymentMethodList>(
        runtime,
        {
          method: 'GET',
          path: collectionPath(organizationId),
          query: {
            customerId: params.customerId,
            type: params.type,
            status: params.status,
            limit: params.limit,
            starting_after: params.startingAfter,
          },
        },
        PaymentMethodListSchema
      )
    },
    create(organizationId: string, params: PaymentMethodCreateParams) {
      return IntegrationRequest<PaymentMethod>(
        runtime,
        { method: 'POST', path: collectionPath(organizationId), body: params },
        PaymentMethodSchema
      )
    },
    retrieve(organizationId: string, paymentMethodId: string) {
      return IntegrationRequest<PaymentMethod>(
        runtime,
        {
          method: 'GET',
          path: `${collectionPath(organizationId)}/${encodeURIComponent(paymentMethodId)}`,
        },
        PaymentMethodSchema
      )
    },
    update(
      organizationId: string,
      paymentMethodId: string,
      params: PaymentMethodUpdateParams
    ) {
      return IntegrationRequest<PaymentMethod>(
        runtime,
        {
          method: 'PATCH',
          path: `${collectionPath(organizationId)}/${encodeURIComponent(paymentMethodId)}`,
          body: params,
        },
        PaymentMethodSchema
      )
    },
    delete(organizationId: string, paymentMethodId: string) {
      return IntegrationRequest<DeletedPaymentMethod>(
        runtime,
        {
          method: 'DELETE',
          path: `${collectionPath(organizationId)}/${encodeURIComponent(paymentMethodId)}`,
        },
        DeletedPaymentMethodSchema
      )
    },
    setDefault(organizationId: string, paymentMethodId: string) {
      return IntegrationRequest<PaymentMethod>(
        runtime,
        {
          method: 'POST',
          path: `${collectionPath(organizationId)}/${encodeURIComponent(paymentMethodId)}/default`,
        },
        PaymentMethodSchema
      )
    },
    listForCustomer(
      organizationId: string,
      customerId: string,
      params: Omit<PaymentMethodListParams, 'customerId'> = {}
    ) {
      return IntegrationRequest<PaymentMethodList>(
        runtime,
        {
          method: 'GET',
          path: `${collectionPath(organizationId).replace('/payment-methods', '')}/customers/${encodeURIComponent(customerId)}/payment-methods`,
          query: {
            type: params.type,
            status: params.status,
            limit: params.limit,
            starting_after: params.startingAfter,
          },
        },
        PaymentMethodListSchema
      )
    },
  }
}
