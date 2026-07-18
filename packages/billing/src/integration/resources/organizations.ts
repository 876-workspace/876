import { BillingOrganizationSchema } from '../schemas'
import { IntegrationRequest } from '../request'
import type { IntegrationRuntime } from '../runtime'
import type { BillingOrganization } from '../types'

/** `$billing.organizations.*` — Billing workspace integration operations. */
export function createIntegrationOrganizationsResource(
  runtime: IntegrationRuntime
) {
  return {
    /** Retrieves the Billing workspace linked to a core organization. */
    retrieve(organizationId: string) {
      return IntegrationRequest<BillingOrganization>(
        runtime,
        {
          method: 'GET',
          path: `/api/v1/integrations/organizations/${encodeURIComponent(organizationId)}`,
        },
        BillingOrganizationSchema
      )
    },
  }
}
