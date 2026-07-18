import 'server-only'

import { create876PlatformClient } from '@876/core/platform'
import { headers } from 'next/headers'

/**
 * Server-only factory for the narrow platform bootstrap client. It serves
 * Billing's routing memberships, feature evaluation, and app-subscription
 * entitlements. Billing-local records remain behind `service`.
 */
export async function getPlatformClient() {
  const requestId = (await headers()).get('x-request-id') ?? undefined

  return create876PlatformClient({
    apiKey: process.env.BILLING_API_876_KEY,
    requestId,
  })
}

/**
 * Headers-free platform client for background work (snapshot refresh, one-off
 * backfills) that runs outside a request scope. Uses the same credentials as
 * the request-scoped client; `create876PlatformClient` defaults the internal
 * key to `API_INTERNAL_KEY`, the identity API's expected secret.
 */
export function createBackgroundPlatformClient() {
  return create876PlatformClient({
    apiKey: process.env.BILLING_API_876_KEY,
  })
}
