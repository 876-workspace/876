import 'server-only'

import { create876PlatformClient } from '@876/core/platform'
import { headers } from 'next/headers'

export async function getPlatformClient() {
  return create876PlatformClient({
    apiKey: process.env.COMMERCE_API_876_KEY,
    requestId: (await headers()).get('x-request-id') ?? undefined,
  })
}
