import { create876AdminClient } from '@876/admin'
import { create876Client as createPlatformClient } from '@876/sdk'
import { create876Client as createBillingClient } from '@876/billing'
import { create876AdminClient as createBillingAdminClient } from '@876/billing/admin'
import { create876BillingIntegrationClient } from '@876/billing/integration'
import { create876CouriersClient } from '@876/couriers'
import { create876CouriersAdminClient } from '@876/couriers/admin'
import { create876StorageClient } from '@876/storage'
import { createWidgetsClient } from '@876/widgets/server'
import { createWidgetsAdminClient } from '@876/widgets/server/admin'
import type { ServiceClients, ServerClientOptions } from './types'

export function createServiceClients(options: ServerClientOptions): ServiceClients {
  const opts = options as unknown as Record<string, unknown> & ServerClientOptions
  const { app: _app, requestId, apiKey, baseUrl, accessToken, fetch, credentials, collectDeviceSignal, oauth, services } = opts
  const internalKey = (opts as unknown as { internalKey?: string }).internalKey

  const platform = createPlatformClient({
    ...(baseUrl ? { baseUrl: baseUrl as string } : {}),
    ...(apiKey ? { apiKey: apiKey as string } : {}),
    ...(accessToken ? { accessToken: accessToken as string } : {}),
    ...(fetch ? { fetch: fetch as typeof fetch } : {}),
    ...(credentials ? { credentials: credentials as RequestCredentials } : {}),
    ...(typeof collectDeviceSignal === 'boolean' ? { collectDeviceSignal } : {}),
    ...(oauth ? { oauth: oauth as never } : {}),
  })

  const servicesRecord = services as unknown as { platformAdmin?: unknown } | undefined
  const adminFromServices = servicesRecord?.platformAdmin
  const adminFallback =
    !adminFromServices && internalKey ? { internalKey, apiKey, requestId } : undefined
  const adminOptions = (adminFromServices ?? adminFallback) as unknown

  const platformAdmin = adminOptions ? create876AdminClient(adminOptions as never) : undefined

  const billing = (services as unknown as { billing?: { tenant?: unknown; integration?: unknown; admin?: unknown } })?.billing
  const billingTenant = (billing as { tenant?: unknown })?.tenant
    ? createBillingClient((billing as { tenant: never }).tenant)
    : undefined
  const billingIntegration = (billing as { integration?: unknown })?.integration
    ? create876BillingIntegrationClient((billing as { integration: never }).integration)
    : undefined
  const billingAdmin = (billing as { admin?: unknown })?.admin
    ? createBillingAdminClient((billing as { admin: never }).admin)
    : undefined

  const couriers = (services as unknown as { couriers?: { client?: unknown; admin?: unknown } })?.couriers
  const couriersClient = (couriers as { client?: unknown })?.client
    ? create876CouriersClient((couriers as { client: never }).client)
    : undefined
  const couriersAdmin = (couriers as { admin?: unknown })?.admin
    ? create876CouriersAdminClient((couriers as { admin: never }).admin)
    : undefined

  const storageOpts = (services as unknown as { storage?: unknown })?.storage
  const storage = storageOpts ? create876StorageClient(storageOpts as never) : undefined

  const widgetsConfig = (services as unknown as { widgets?: { member?: unknown; admin?: unknown } | unknown })?.widgets as
    | { member?: unknown; admin?: unknown }
    | undefined

  let widgets: ServiceClients['widgets']
  if (widgetsConfig) {
    if ((widgetsConfig as { member?: unknown }).member || (widgetsConfig as { admin?: unknown }).admin) {
      const member = (widgetsConfig as { member?: unknown }).member
        ? createWidgetsClient((widgetsConfig as { member: never }).member)
        : undefined
      const admin = (widgetsConfig as { admin?: unknown }).admin
        ? createWidgetsAdminClient((widgetsConfig as { admin: never }).admin)
        : undefined
      widgets = { member, admin }
    } else {
      const legacy = widgetsConfig as unknown as never
      const member = createWidgetsClient(legacy)
      widgets = { member }
    }
  }

  return {
    platform,
    platformAdmin,
    billing:
      billingTenant || billingIntegration || billingAdmin
        ? { tenant: billingTenant, integration: billingIntegration, admin: billingAdmin }
        : undefined,
    couriers: couriersClient || couriersAdmin ? { client: couriersClient, admin: couriersAdmin } : undefined,
    storage,
    widgets,
  }
}
