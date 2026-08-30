import { create876AdminClient } from '@876/admin'
import { create876Client as createBillingClient } from '@876/billing'
import { create876AdminClient as createBillingAdminClient } from '@876/billing/admin'
import { create876BillingIntegrationClient } from '@876/billing/integration'
import { create876CouriersClient } from '@876/couriers'
import { create876CouriersAdminClient } from '@876/couriers/admin'
import { create876CrmClient, create876CrmWorkspaceClient } from '@876/crm'
import { create876Client as createPlatformClient } from '@876/sdk'
import { create876StorageClient } from '@876/storage'
import { createWidgetsClient } from '@876/widgets/server'
import { createWidgetsAdminClient } from '@876/widgets/server/admin'
import { create876WorkIntegrationClient } from '@876/work/integration'
import { create876WorkOperatorClient } from '@876/work/operator'
import { create876WorkSessionClient } from '@876/work/session'
import type { ServiceClients, ServerClientOptions } from './types'

export function createServiceClients(
  options: ServerClientOptions
): ServiceClients {
  const opts = options as unknown as Record<string, unknown> &
    ServerClientOptions
  const {
    app: _app,
    requestId,
    apiKey,
    baseUrl,
    accessToken,
    fetch,
    credentials,
    collectDeviceSignal,
    oauth,
    services,
  } = opts
  const internalKey = (opts as unknown as { internalKey?: string }).internalKey

  const platform = createPlatformClient({
    ...(baseUrl ? { baseUrl: baseUrl as string } : {}),
    ...(apiKey ? { apiKey: apiKey as string } : {}),
    ...(accessToken ? { accessToken: accessToken as string } : {}),
    ...(fetch ? { fetch: fetch as typeof globalThis.fetch } : {}),
    ...(credentials ? { credentials: credentials as RequestCredentials } : {}),
    ...(typeof collectDeviceSignal === 'boolean'
      ? { collectDeviceSignal }
      : {}),
    ...(oauth ? { oauth: oauth as never } : {}),
  })

  const servicesRecord = services as unknown as
    { platformAdmin?: unknown } | undefined
  const adminFromServices = servicesRecord?.platformAdmin
  const adminFallback =
    !adminFromServices && internalKey
      ? { internalKey, apiKey, requestId }
      : undefined
  const adminOptions = (adminFromServices ?? adminFallback) as unknown
  const platformAdmin = adminOptions
    ? create876AdminClient(adminOptions as never)
    : undefined

  const billing = (
    services as unknown as {
      billing?: { tenant?: unknown; integration?: unknown; admin?: unknown }
    }
  )?.billing
  const billingTenant = billing?.tenant
    ? createBillingClient(billing.tenant as never)
    : undefined
  const billingIntegration = billing?.integration
    ? create876BillingIntegrationClient(billing.integration as never)
    : undefined
  const billingAdmin = billing?.admin
    ? createBillingAdminClient(billing.admin as never)
    : undefined

  const couriers = (
    services as unknown as { couriers?: { client?: unknown; admin?: unknown } }
  )?.couriers
  const couriersClient = couriers?.client
    ? create876CouriersClient(couriers.client as never)
    : undefined
  const couriersAdmin = couriers?.admin
    ? create876CouriersAdminClient(couriers.admin as never)
    : undefined

  const crmOptions = (services as unknown as { crm?: unknown })?.crm
  const crm = crmOptions ? create876CrmClient(crmOptions as never) : undefined
  const crmWorkspace = crmOptions
    ? create876CrmWorkspaceClient(crmOptions as never)
    : undefined

  const storageOptions = (services as unknown as { storage?: unknown })?.storage
  const storage = storageOptions
    ? create876StorageClient(storageOptions as never)
    : undefined

  const widgetsConfig = (
    services as unknown as {
      widgets?: { member?: unknown; admin?: unknown } | unknown
    }
  )?.widgets as { member?: unknown; admin?: unknown } | undefined
  let widgets: ServiceClients['widgets']
  if (widgetsConfig) {
    if (widgetsConfig.member || widgetsConfig.admin) {
      widgets = {
        member: widgetsConfig.member
          ? createWidgetsClient(widgetsConfig.member as never)
          : undefined,
        admin: widgetsConfig.admin
          ? createWidgetsAdminClient(widgetsConfig.admin as never)
          : undefined,
      }
    } else {
      widgets = { member: createWidgetsClient(widgetsConfig as never) }
    }
  }

  const workConfig = (
    services as unknown as {
      work?: { operator?: unknown; integration?: unknown; session?: unknown }
    }
  )?.work
  const work = workConfig
    ? {
        operator: workConfig.operator
          ? create876WorkOperatorClient(workConfig.operator as never)
          : undefined,
        integration: workConfig.integration
          ? create876WorkIntegrationClient(workConfig.integration as never)
          : undefined,
        session: workConfig.session
          ? create876WorkSessionClient(workConfig.session as never)
          : undefined,
      }
    : undefined

  return {
    platform,
    platformAdmin,
    billing:
      billingTenant || billingIntegration || billingAdmin
        ? {
            tenant: billingTenant,
            integration: billingIntegration,
            admin: billingAdmin,
          }
        : undefined,
    couriers:
      couriersClient || couriersAdmin
        ? { client: couriersClient, admin: couriersAdmin }
        : undefined,
    crm,
    crmWorkspace,
    storage,
    widgets,
    work,
  }
}
