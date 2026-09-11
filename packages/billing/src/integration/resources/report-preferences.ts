import { BillingReportPreferencesSchema } from '../schemas'
import { IntegrationRequest } from '../request'
import type { IntegrationRuntime } from '../runtime'
import type {
  BillingReportPreferences,
  BillingReportPreferencesUpdateParams,
} from '../types'

function preferencesPath(organizationId: string): string {
  return `/api/v1/integrations/organizations/${encodeURIComponent(organizationId)}/report-preferences`
}

/** Organization-scoped reporting settings for connected systems. */
export function createIntegrationReportPreferencesResource(
  runtime: IntegrationRuntime
) {
  return {
    retrieve(organizationId: string) {
      return IntegrationRequest<BillingReportPreferences>(
        runtime,
        { method: 'GET', path: preferencesPath(organizationId) },
        BillingReportPreferencesSchema
      )
    },
    update(
      organizationId: string,
      params: BillingReportPreferencesUpdateParams
    ) {
      return IntegrationRequest<BillingReportPreferences>(
        runtime,
        {
          method: 'PATCH',
          path: preferencesPath(organizationId),
          body: params,
        },
        BillingReportPreferencesSchema
      )
    },
  }
}
