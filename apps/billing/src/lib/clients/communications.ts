import 'server-only'

import { create876CommunicationsServiceClient } from '@876/communications/service'
import type { CommunicationsServiceClient } from '@876/communications/service'

let client: CommunicationsServiceClient | undefined

/**
 * Billing's one server-to-server Communications client.
 *
 * Initialization is lazy so module import never captures deployment secrets
 * before runtime configuration is available. The bounded client itself fails
 * closed with `communications/not-configured` when either value is absent.
 */
export function communicationsService(): CommunicationsServiceClient {
  client ??= create876CommunicationsServiceClient({
    baseUrl: process.env.COMMUNICATIONS_API_URL,
    internalKey: process.env.COMMUNICATIONS_INTERNAL_KEY,
  })
  return client
}

/** Test-only reset for env/client isolation. */
export function resetCommunicationsServiceForTest() {
  client = undefined
}
