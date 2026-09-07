import {
  BillingPaymentModeListSchema,
  BillingPaymentModeSchema,
  DeletedBillingPaymentModeSchema,
} from '../schemas'
import { IntegrationRequest } from '../request'
import type { IntegrationRuntime } from '../runtime'
import type {
  BillingPaymentMode,
  BillingPaymentModeCreateParams,
  BillingPaymentModeDeleted,
  BillingPaymentModeList,
  BillingPaymentModeUpdateParams,
} from '../types'

function collectionPath(organizationId: string): string {
  return `/api/v1/integrations/organizations/${encodeURIComponent(organizationId)}/payment-modes`
}

/** `$876.billing.paymentModes.list` — shared payment choices for connected apps. */
export function createIntegrationPaymentModesResource(
  runtime: IntegrationRuntime
) {
  return {
    list(organizationId: string) {
      return IntegrationRequest<BillingPaymentModeList>(
        runtime,
        {
          method: 'GET',
          path: collectionPath(organizationId),
        },
        BillingPaymentModeListSchema
      )
    },
    create(organizationId: string, params: BillingPaymentModeCreateParams) {
      return IntegrationRequest<BillingPaymentMode>(
        runtime,
        { method: 'POST', path: collectionPath(organizationId), body: params },
        BillingPaymentModeSchema
      )
    },
    retrieve(organizationId: string, modeId: string) {
      return IntegrationRequest<BillingPaymentMode>(
        runtime,
        {
          method: 'GET',
          path: `${collectionPath(organizationId)}/${encodeURIComponent(modeId)}`,
        },
        BillingPaymentModeSchema
      )
    },
    update(
      organizationId: string,
      modeId: string,
      params: BillingPaymentModeUpdateParams
    ) {
      return IntegrationRequest<BillingPaymentMode>(
        runtime,
        {
          method: 'PATCH',
          path: `${collectionPath(organizationId)}/${encodeURIComponent(modeId)}`,
          body: params,
        },
        BillingPaymentModeSchema
      )
    },
    delete(organizationId: string, modeId: string) {
      return IntegrationRequest<BillingPaymentModeDeleted>(
        runtime,
        {
          method: 'DELETE',
          path: `${collectionPath(organizationId)}/${encodeURIComponent(modeId)}`,
        },
        DeletedBillingPaymentModeSchema
      )
    },
  }
}
