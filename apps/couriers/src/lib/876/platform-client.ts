import 'server-only'

import { create876PlatformClient } from '@876/core/platform'
import { headers } from 'next/headers'

/**
 * Server-only factory for the narrow platform bootstrap client. It serves
 * Couriers' routing memberships, feature evaluation, and app-subscription
 * entitlements. Couriers-local records remain behind `service`.
 */
export async function getPlatformClient() {
  const requestId = (await headers()).get('x-request-id') ?? undefined

  return create876PlatformClient({
    apiKey: process.env.API_876_KEY,
    requestId,
  })
}
