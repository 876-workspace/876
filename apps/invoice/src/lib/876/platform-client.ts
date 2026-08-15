import 'server-only'

import { create876PlatformClient } from '@876/core/platform'
import { headers } from 'next/headers'

export async function getPlatformClient() {
  const requestId = (await headers()).get('x-request-id') ?? undefined
  return create876PlatformClient({
    apiKey: process.env.INVOICE_API_876_KEY,
    requestId,
  })
}
