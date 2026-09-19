import 'server-only'

import { create876PlatformClient } from '@876/core/platform'
import { headers } from 'next/headers'

/** Server-only factory for Billing's existing platform bootstrap calls. */
export async function getPlatformClient() {
  const requestId = (await headers()).get('x-request-id') ?? undefined

  return create876PlatformClient({
    apiKey: process.env.BILLING_API_876_KEY,
    requestId,
  })
}

/** Headers-free platform client for existing background provisioning work. */
export function createBackgroundPlatformClient() {
  return create876PlatformClient({
    apiKey: process.env.BILLING_API_876_KEY,
  })
}
