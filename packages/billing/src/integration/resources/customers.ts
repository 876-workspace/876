import {
  BillingCustomerListSchema,
  BillingCustomerSchema,
  DeletedBillingCustomerSchema,
} from '../schemas'
import { IntegrationRequest } from '../request'
import type { IntegrationRuntime } from '../runtime'
import type {
  BillingCustomer,
  BillingCustomerCreateParams,
  BillingCustomerList,
  BillingCustomerListParams,
  BillingCustomerUpdateParams,
  DeletedBillingCustomer,
  IntegrationCreateOptions,
} from '../types'

function collectionPath(organizationId: string): string {
  return `/api/v1/integrations/organizations/${encodeURIComponent(organizationId)}/customers`
}

/** `$billing.customers.*` — organization-scoped customer integrations. */
export function createIntegrationCustomersResource(
  runtime: IntegrationRuntime
) {
  return {
    /** Lists Billing customers for a core organization. */
    list(organizationId: string, params: BillingCustomerListParams = {}) {
      return IntegrationRequest<BillingCustomerList>(
        runtime,
        {
          method: 'GET',
          path: collectionPath(organizationId),
          query: {
            limit: params.limit,
            starting_after: params.starting_after,
            ending_before: params.ending_before,
            user_id: params.user_id,
            organization_id: params.organization_id,
          },
        },
        BillingCustomerListSchema
      )
    },

    /** Retrieves one Billing customer for a core organization. */
    retrieve(organizationId: string, customerId: string) {
      return IntegrationRequest<BillingCustomer>(
        runtime,
        {
          method: 'GET',
          path: `${collectionPath(organizationId)}/${encodeURIComponent(customerId)}`,
        },
        BillingCustomerSchema
      )
    },

    /** Creates a Billing customer for a core organization. */
    create(
      organizationId: string,
      params: BillingCustomerCreateParams,
      options: IntegrationCreateOptions
    ) {
      return IntegrationRequest<BillingCustomer>(
        runtime,
        {
          method: 'POST',
          path: collectionPath(organizationId),
          body: params,
          headers: { 'Idempotency-Key': options.idempotencyKey },
        },
        BillingCustomerSchema
      )
    },

    /** Updates one Billing customer for a core organization. */
    update(
      organizationId: string,
      customerId: string,
      params: BillingCustomerUpdateParams
    ) {
      return IntegrationRequest<BillingCustomer>(
        runtime,
        {
          method: 'PATCH',
          path: `${collectionPath(organizationId)}/${encodeURIComponent(customerId)}`,
          body: params,
        },
        BillingCustomerSchema
      )
    },

    /** Archives one Billing customer for a core organization. */
    delete(organizationId: string, customerId: string) {
      return IntegrationRequest<DeletedBillingCustomer>(
        runtime,
        {
          method: 'DELETE',
          path: `${collectionPath(organizationId)}/${encodeURIComponent(customerId)}`,
        },
        DeletedBillingCustomerSchema
      )
    },
  }
}
