import 'server-only'

import { create876ServerClient } from '@876/client/server'
import { create876AdminClient as createBillingAdminClient } from '@876/billing/admin'
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

export function createConsole876Client(requestId?: string) {
  return create876ServerClient({
    app: 'console',
    apiKey: process.env.API_876_KEY,
    internalKey: process.env.API_INTERNAL_KEY!,
    requestId,
    services: {
      billing: {
        admin: getBillingAdminOptions(requestId),
      },
      couriers: {
        admin: {
          baseUrl: process.env.COURIERS_API_URL,
          internalKey:
            process.env.COURIERS_INTERNAL_KEY ?? process.env.API_INTERNAL_KEY!,
          requestId,
        },
      },
      storage: {
        internalKey: process.env.STORAGE_INTERNAL_KEY!,
        requestId,
      },
      widgets: getWidgetsOptions(requestId),
    },
  })
}

export const $876 = createConsole876Client()

/**
 * Internal Billing admin client for Console-specific Billing administration
 * operations not surfaced on the canonical `$876` (e.g. app billing stats).
 * Not for use in app UI code outside `src/lib/`.
 */
export const billingAdmin = createBillingAdminClient(getBillingAdminOptions())

/**
 * Internal Widgets admin client for Console-specific widget administration
 * operations not surfaced on the canonical `$876` (e.g. notepad stats).
 * Not for use in app UI code outside `src/lib/` and `src/features/`.
 */
export const widgetsAdmin = createWidgetsAdminClient(getWidgetsOptions())

export type Console876Client = ReturnType<typeof createConsole876Client>
