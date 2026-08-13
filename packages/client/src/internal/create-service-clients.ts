import { create876AdminClient } from '@876/admin'
import { create876Client as createPlatformClient } from '@876/sdk'
import { create876Client as createBillingClient } from '@876/billing'
import { create876AdminClient as createBillingAdminClient } from '@876/billing/admin'
import { create876BillingIntegrationClient } from '@876/billing/integration'
import { create876CouriersClient } from '@876/couriers'
import { create876CouriersAdminClient } from '@876/couriers/admin'
import { create876StorageClient } from '@876/storage'
import { createWidgetsClient } from '@876/widgets/server'
import type { ServiceClients, ServerClientOptions } from './types'

/**
 * Instantiates each configured owning client from {@link ServerClientOptions}
 * and returns the typed {@link ServiceClients} container. This module only
 * builds clients — it never exposes resources and contains no business logic.
 */
export function createServiceClients(
  options: ServerClientOptions
): ServiceClients {
  const {
    app: _app,
    requestId,
    apiKey,
    internalKey,
    baseUrl,
    services,
  } = options

  const platform = createPlatformClient({
    ...(baseUrl ? { baseUrl } : {}),
    ...(apiKey ? { apiKey } : {}),
  })

  const adminOptions =
    services?.platformAdmin ??
    (internalKey ? { internalKey, apiKey, requestId } : undefined)

  const platformAdmin = adminOptions
    ? create876AdminClient(adminOptions)
    : undefined

  const billing = services?.billing
  const billingTenant = billing?.tenant
    ? createBillingClient(billing.tenant)
    : undefined
  const billingIntegration = billing?.integration
    ? create876BillingIntegrationClient(billing.integration)
    : undefined
  const billingAdmin = billing?.admin
    ? createBillingAdminClient(billing.admin)
    : undefined

  const couriers = services?.couriers
  const couriersClient = couriers?.client
    ? create876CouriersClient(couriers.client)
    : undefined
  const couriersAdmin = couriers?.admin
    ? create876CouriersAdminClient(couriers.admin)
    : undefined

  const storage = services?.storage
    ? create876StorageClient(services.storage)
    : undefined

  const widgets = services?.widgets
    ? createWidgetsClient(services.widgets)
    : undefined

  return {
    platform,
    platformAdmin,
    billing: billingTenant || billingIntegration || billingAdmin
      ? {
          tenant: billingTenant,
          integration: billingIntegration,
          admin: billingAdmin,
        }
      : undefined,
    couriers: couriersClient || couriersAdmin
      ? { client: couriersClient, admin: couriersAdmin }
      : undefined,
    storage,
    widgets,
  }
}
