import 'server-only'

import { create876AdminClient } from '@876/admin'
import { create876AdminClient as createBillingAdminClient } from '@876/billing/admin'
import { create876BillingIntegrationClient } from '@876/billing/integration'
import { createConsoleSurfaces as composeConsoleSurfaces } from '@876/client/server'
import { createWidgetsAdminClient } from '@876/widgets/server/admin'

function getBillingAdminOptions(requestId?: string) {
  return {
    baseUrl: process.env.BILLING_API_URL,
    internalKey: process.env.BILLING_INTERNAL_KEY!,
    requestId,
  }
}
function getWidgetsOptions(requestId?: string) {
  return {
    baseUrl: process.env.WIDGETS_API_URL,
    serviceKey: process.env.WIDGETS_SERVICE_KEY,
    requestId,
  }
}
function getCrmOptions(requestId?: string) {
  return {
    baseUrl: process.env.CRM_API_URL,
    internalKey: process.env.CRM_INTERNAL_KEY!,
    requestId,
  }
}
function getWorkOptions(requestId?: string) {
  return {
    baseUrl: process.env.WORK_API_URL,
    internalKey: process.env.WORK_INTERNAL_KEY!,
    requestId,
  }
}
function getPlatformAdminOptions(requestId?: string) {
  return {
    baseUrl: process.env.API_URL,
    internalKey: process.env.API_INTERNAL_KEY!,
    apiKey: process.env.API_876_KEY,
    requestId,
  }
}
function getConsoleOptions(requestId?: string) {
  return {
    app: 'console' as const,
    apiKey: process.env.API_876_KEY,
    requestId,
    services: {
      platformAdmin: getPlatformAdminOptions(requestId),
      billing: {
        admin: getBillingAdminOptions(requestId),
        integration: getBillingAdminOptions(requestId),
      },
      couriers: {
        admin: {
          baseUrl: process.env.COURIERS_API_URL,
          internalKey:
            process.env.COURIERS_INTERNAL_KEY ?? process.env.API_INTERNAL_KEY!,
          requestId,
        },
      },
      crm: getCrmOptions(requestId),
      work: { operator: getWorkOptions(requestId) },
      storage: {
        internalKey: process.env.STORAGE_INTERNAL_KEY!,
        requestId,
      },
      widgets: {
        member: getWidgetsOptions(requestId),
        admin: getWidgetsOptions(requestId),
      },
    },
  }
}

export function createConsoleSurfaces(requestId?: string) {
  return composeConsoleSurfaces(getConsoleOptions(requestId))
}
export function createConsole876Client(requestId?: string) {
  return createConsoleSurfaces(requestId).$876
}
const defaultSurfaces = createConsoleSurfaces()
export const $876 = defaultSurfaces.$876
export const workspace = defaultSurfaces.workspace
export const platform = defaultSurfaces.platform
export const coreAdmin = create876AdminClient(getPlatformAdminOptions())
export const billingAdmin = createBillingAdminClient(getBillingAdminOptions())
export const billingIntegration = create876BillingIntegrationClient(
  getBillingAdminOptions()
)
export const widgetsAdmin = createWidgetsAdminClient(getWidgetsOptions())
export type Console876Client = ReturnType<typeof createConsole876Client>
