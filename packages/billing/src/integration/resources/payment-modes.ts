import { BillingPaymentModeListSchema } from '../schemas'
import { IntegrationRequest } from '../request'
import type { IntegrationRuntime } from '../runtime'
import type { BillingPaymentModeList } from '../types'

/** `$billing.paymentModes.list` — shared payment choices for connected apps. */
export function createIntegrationPaymentModesResource(
  runtime: IntegrationRuntime
) {
  return {
    list(organizationId: string) {
      return IntegrationRequest<BillingPaymentModeList>(
        runtime,
        {
          method: 'GET',
          path: `/api/v1/integrations/organizations/${encodeURIComponent(organizationId)}/payment-modes`,
        },
        BillingPaymentModeListSchema
      )
    },
  }
}
