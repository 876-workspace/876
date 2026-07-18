import { BillingBankAccountListSchema } from '../schemas'
import { IntegrationRequest } from '../request'
import type { IntegrationRuntime } from '../runtime'
import type { BillingBankAccountList } from '../types'

/** `$billing.bankAccounts.list` — shared deposit choices for connected apps. */
export function createIntegrationBankAccountsResource(
  runtime: IntegrationRuntime
) {
  return {
    list(organizationId: string) {
      return IntegrationRequest<BillingBankAccountList>(
        runtime,
        {
          method: 'GET',
          path: `/api/v1/integrations/organizations/${encodeURIComponent(organizationId)}/bank-accounts`,
        },
        BillingBankAccountListSchema
      )
    },
  }
}
