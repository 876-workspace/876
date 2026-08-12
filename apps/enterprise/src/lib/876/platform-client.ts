import 'server-only'

import { create876PlatformClient } from '@876/core/platform'
import { headers } from 'next/headers'

/**
 * Creates Enterprise's request-scoped client for privileged platform reads.
 * Routing and feature evaluation use the internal-key tier so a stale
 * user bearer token cannot block an otherwise valid signed session.
 */
export async function getPlatformClient() {
  const requestId = (await headers()).get('x-request-id') ?? undefined

  return create876PlatformClient({
    apiKey: process.env.API_876_KEY,
    requestId,
  })
}
