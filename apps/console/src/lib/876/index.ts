import 'server-only'

import { create876AdminClient } from '@876/admin'

/**
 * The unified 876 client for Console — the only privileged admin consumer.
 * Call platform and service namespaces directly from this root:
 * `$876.users.list()`, `$876.billing.stats.*`, `$876.widgets.notes.*`, …
 *
 * Console-internal data (team, roles, notes) lives in Console's own
 * database and is reached through `service` (`@/lib/service`), not `$876`.
 */
export function createConsole876Client(requestId?: string) {
  return create876AdminClient({
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
}

export const $876 = createConsole876Client()
