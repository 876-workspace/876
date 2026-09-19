import 'server-only'

import { create876PlatformOperatorClient } from '@876/platform/operator'

function options(requestId?: string) {
  return {
    baseUrl: process.env.API_URL,
    internalKey: process.env.API_INTERNAL_KEY!,
    apiKey: process.env.API_876_KEY,
    requestId,
  }
}

export function createPlatform(requestId?: string) {
  return create876PlatformOperatorClient(options(requestId))
}

export const platform = createPlatform()
