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
import { AdminRequest } from '../request'
import type { AdminRuntime } from '../runtime'

function collectionPath(organizationId: string) {
  return `/api/v1/organizations/${encodeURIComponent(organizationId)}/payment-methods`
}

/** Secret-service payment-method operations, scoped explicitly to an organization. */
export function createAdminPaymentMethodsResource(runtime: AdminRuntime) {
  return {
    list(organizationId: string, params: PaymentMethodListParams = {}) {
      return AdminRequest<PaymentMethodList>(
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
      return AdminRequest<PaymentMethod>(
        runtime,
        { method: 'POST', path: collectionPath(organizationId), body: params },
        PaymentMethodSchema
      )
    },
    retrieve(organizationId: string, paymentMethodId: string) {
      return AdminRequest<PaymentMethod>(
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
      return AdminRequest<PaymentMethod>(
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
      return AdminRequest<DeletedPaymentMethod>(
        runtime,
        {
          method: 'DELETE',
          path: `${collectionPath(organizationId)}/${encodeURIComponent(paymentMethodId)}`,
        },
        DeletedPaymentMethodSchema
      )
    },
    setDefault(organizationId: string, paymentMethodId: string) {
      return AdminRequest<PaymentMethod>(
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
      return AdminRequest<PaymentMethodList>(
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
