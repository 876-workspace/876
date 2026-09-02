import 'server-only'

export { create876BillingIntegrationClient as create876BillingServiceClient } from './integration/client'
export type { BillingIntegrationClient as BillingServiceClient } from './integration/client'
export type { IntegrationClientOptions as BillingServiceClientOptions } from './integration/types'

// The resource types a service caller reads back. Without them a host has to
// import the integration entrypoint purely for a type, which misstates its tier.
export type * from './integration/types'
