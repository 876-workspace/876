import 'server-only'

import { create876PlatformClient } from '@876/core/platform'
import * as Sentry from '@sentry/nextjs'
import { headers } from 'next/headers'

let reportedMissingInternalKey = false

function reportMissingInternalKey() {
  if (reportedMissingInternalKey) return
  reportedMissingInternalKey = true

  Sentry.captureMessage('CRM platform client missing API_INTERNAL_KEY', {
    level: 'error',
    tags: { category: 'platform_client' },
  })
}

export async function getPlatformClient() {
  const requestId = (await headers()).get('x-request-id') ?? undefined
  if (!process.env.API_INTERNAL_KEY) reportMissingInternalKey()

  return create876PlatformClient({
    apiKey: process.env.CRM_API_876_KEY,
    requestId,
  })
}
