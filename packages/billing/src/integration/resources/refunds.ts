import { BillingRefundCreatedSchema, BillingRefundListSchema } from '../schemas'
import { IntegrationRequest } from '../request'
import type { IntegrationRuntime } from '../runtime'
import type {
  BillingRefundCreateParams,
  BillingRefundCreated,
  BillingRefundList,
} from '../types'

function collectionPath(organizationId: string): string {
  return `/api/v1/integrations/organizations/${encodeURIComponent(organizationId)}/refunds`
}

/** `$876.billing.refunds.*` — payment refund evidence for connected apps. */
export function createIntegrationRefundsResource(runtime: IntegrationRuntime) {
  return {
    list(organizationId: string) {
      return IntegrationRequest<BillingRefundList>(
        runtime,
        { method: 'GET', path: collectionPath(organizationId) },
        BillingRefundListSchema
      )
    },

    create(organizationId: string, params: BillingRefundCreateParams) {
      return IntegrationRequest<BillingRefundCreated>(
        runtime,
        { method: 'POST', path: collectionPath(organizationId), body: params },
        BillingRefundCreatedSchema
      )
    },
  }
}
