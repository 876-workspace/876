import 'server-only'

import { create876AdminClient } from '@876/admin'
import { create876CouriersAdminClient } from '@876/couriers/admin'

/**
 * The unified 876 client for Console — the only privileged admin consumer.
 * Call platform and service namespaces directly from this root:
 * `$876.users.list()`, `$876.billing.stats.*`, `$876.widgets.notes.*`, `$876.couriers.customers.list()`, …
 *
 * Console-internal data (team, roles, notes) lives in Console's own
 * database and is reached through `service` (`@/lib/service`), not `$876`.
 *
 * Product namespaces are composed explicitly here. `@876/admin` remains Core
 * platform admin; Console composes privileged product tiers (billing via
 * `@876/admin` options, couriers via `@876/couriers/admin`, etc.) so the
 * control plane can administer product APIs without direct DB access.
 */
export function createConsole876Client(requestId?: string) {
  const platform = create876AdminClient({
    internalKey: process.env.API_INTERNAL_KEY,
    apiKey: process.env.API_876_KEY,
    requestId,
    storage: {
      internalKey: process.env.STORAGE_INTERNAL_KEY,
      requestId,
    },
    billing: {
      baseUrl: process.env.BILLING_API_URL,
      internalKey: process.env.BILLING_INTERNAL_KEY,
      requestId,
    },
    widgets: {
      baseUrl: process.env.WIDGETS_API_URL,
      serviceKey: process.env.WIDGETS_SERVICE_KEY,
      host: 'console',
    },
  })

  const couriers = create876CouriersAdminClient({
    baseUrl: process.env.COURIERS_API_URL,
    apiKey: process.env.COURIERS_API_KEY,
    internalKey:
      process.env.COURIERS_INTERNAL_KEY ?? process.env.API_INTERNAL_KEY,
    requestId,
  })

  return {
    ...platform,
    couriers,
  }
}

export const $876 = createConsole876Client()

export type Console876Client = ReturnType<typeof createConsole876Client>
