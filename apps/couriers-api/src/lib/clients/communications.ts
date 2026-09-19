import {
  create876CommunicationsServiceClient,
  type CommunicationsServiceClient,
} from '@876/communications/service'

import { getSettings } from '@/config'

let client: CommunicationsServiceClient | undefined

/**
 * Couriers' one server-to-server Communications client.
 *
 * Initialization is lazy so module import never captures deployment secrets
 * before runtime configuration is available. The bounded client itself fails
 * closed with `communications/not-configured` when either value is absent,
 * so an unconfigured service boots and skips notification sends instead of
 * crashing.
 */
export function communicationsService(): CommunicationsServiceClient {
  if (!client) {
    const settings = getSettings()
    client = create876CommunicationsServiceClient({
      baseUrl: settings.communicationsApiUrl || undefined,
      internalKey: settings.communicationsInternalKey || undefined,
    })
  }
  return client
}

/** Test-only reset for env/client isolation. */
export function resetCommunicationsServiceForTest() {
  client = undefined
}
