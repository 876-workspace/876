import 'server-only'

import { create876AdminClient } from '@876/admin'
import { createConsoleSurfaces as composeConsoleSurfaces } from '@876/client/server'
import { create876AdminClient as createBillingAdminClient } from '@876/billing/admin'
import { create876BillingIntegrationClient } from '@876/billing/integration'
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

/** Creates the request-scoped resource and control-plane surfaces for Console. */
export function createConsoleSurfaces(requestId?: string) {
  return composeConsoleSurfaces(getConsoleOptions(requestId))
}

/** Backwards-compatible factory for code that only needs the resource plane. */
export function createConsole876Client(requestId?: string) {
  return createConsoleSurfaces(requestId).$876
}

const defaultSurfaces = createConsoleSurfaces()

/** Resource/data plane: users, organizations, invoices, customers, files, etc. */
export const $876 = defaultSurfaces.$876

/** Organization control plane: setup, app grants, modules, and provisioning. */
export const workspace = defaultSurfaces.workspace

/** 876 operator control plane: API keys, auth attempts, devices, and app flags. */
export const platform = defaultSurfaces.platform

export const coreAdmin = create876AdminClient(getPlatformAdminOptions())

/**
 * Internal Billing admin client for Console-specific Billing administration
 * operations not surfaced on the canonical `$876` (e.g. app billing stats).
 * Not for use in app UI code outside `src/lib/`.
 */
export const billingAdmin = createBillingAdminClient(getBillingAdminOptions())

/**
 * Internal Billing integration client for organization-scoped Billing
 * resources that collide with Core resources on the canonical facade.
 */
export const billingIntegration = create876BillingIntegrationClient(
  getBillingAdminOptions()
)

/**
 * Internal Widgets admin client for Console-specific widget administration
 * operations not surfaced on the canonical `$876` (e.g. notepad stats).
 * Not for use in app UI code outside `src/lib/` and `src/features/`.
 */
export const widgetsAdmin = createWidgetsAdminClient(getWidgetsOptions())

export type Console876Client = ReturnType<typeof createConsole876Client>
