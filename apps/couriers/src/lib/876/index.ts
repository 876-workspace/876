import 'server-only'

import { create876ServerClient } from '@876/client/server'
import { headers } from 'next/headers'

/**
 * Server-only 876 ecosystem client for Couriers.
 *
 * Platform, Storage, Billing, and Widgets calls all branch from `$876`.
 * Routing and entitlement bootstrap continue to use the narrow delegated
 * client in `@/lib/876/platform-client`.
 */
export const $876 = create876ServerClient({
  platform: {
    apiKey: process.env.API_876_KEY,
  },
  storage: {
    internalKey: process.env.STORAGE_INTERNAL_KEY,
  },
  billing: {
    baseUrl: process.env.BILLING_API_URL,
    apiKey: process.env.API_876_KEY,
  },
  widgets: {
    baseUrl: process.env.WIDGETS_API_URL,
    serviceKey: process.env.WIDGETS_SERVICE_KEY,
    host: 'couriers',
  },
})

/** Creates the same root with request attribution for Billing writes. */
export async function get876Client() {
  const requestId = (await headers()).get('x-request-id') ?? undefined

  return create876ServerClient({
    platform: {
      apiKey: process.env.API_876_KEY,
    },
    storage: {
      internalKey: process.env.STORAGE_INTERNAL_KEY,
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
}
