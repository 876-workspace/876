import 'server-only'

import { create876ServerClient } from '@876/client/server'
import { create876CouriersAdminClient } from '@876/couriers/admin'
import { headers } from 'next/headers'

/**
 * Server-only 876 ecosystem client for Couriers.
 *
 * Platform, Storage, Billing, Widgets, and Couriers all branch from `$876`.
 * Routing and entitlement bootstrap continue to use the narrow delegated
 * client in `@/lib/876/platform-client`.
 *
 * Couriers is composed here — inside the Couriers application — so
 * `@876/client` does not become a registry of every product. Other apps
 * that do not need Couriers simply do not import `@876/couriers/admin`
 * and do not have a `couriers` property on their `$876` type.
 */
function createCouriers876Client(requestId?: string) {
  const ecosystem = create876ServerClient({
    apiKey: process.env.API_876_KEY,
    requestId,
    storage: {
      internalKey: process.env.STORAGE_INTERNAL_KEY,
      requestId,
    },
    billing: {
      baseUrl: process.env.BILLING_API_URL,
      apiKey: process.env.API_876_KEY,
      requestId,
    },
    widgets: {
      baseUrl: process.env.WIDGETS_API_URL,
      serviceKey: process.env.WIDGETS_SERVICE_KEY,
      host: 'couriers',
    },
  })

  return {
    ...ecosystem,
    couriers: create876CouriersAdminClient({
      baseUrl: process.env.COURIERS_API_URL,
      apiKey: process.env.COURIERS_API_KEY,
      internalKey: process.env.API_INTERNAL_KEY,
      requestId,
    }),
  }
}

export const $876 = createCouriers876Client()

/** Creates the same root with request attribution for Billing + Couriers writes. */
export async function get876Client() {
  const requestId = (await headers()).get('x-request-id') ?? undefined
  return createCouriers876Client(requestId)
}

export type Couriers876Client = ReturnType<typeof createCouriers876Client>
