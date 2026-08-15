import 'server-only'

import { create876PlatformClient } from '@876/core/platform'
import * as Sentry from '@sentry/nextjs'
import { headers } from 'next/headers'

/**
 * Every platform endpoint Invoice depends on (routing memberships, app
 * subscriptions) is admin-tier and authenticates with the secret
 * `x-internal-key`. When `API_INTERNAL_KEY` is absent the client still builds
 * and every call fails 401, which callers would otherwise absorb into "no
 * memberships" — so an organization that has been set up for years looks
 * exactly like a brand-new account being asked to create one. Report it once
 * per isolate so the cause is visible instead of inferred.
 */
let reportedMissingInternalKey = false

function reportMissingInternalKey() {
  if (reportedMissingInternalKey) return
  reportedMissingInternalKey = true

  Sentry.captureMessage(
    'Platform client misconfigured: API_INTERNAL_KEY is not set',
    {
      level: 'error',
      tags: { category: 'platform_client' },
      extra: {
        call: 'getPlatformClient',
        consequence:
          'Every admin-tier platform call (routing memberships, app subscriptions) will fail authentication.',
      },
    }
  )
}

/**
 * Server-only factory for the narrow platform bootstrap client: routing
 * memberships and app-subscription entitlements. Invoice's financial records
 * live in the Billing data plane and are reached through `$876` instead.
 */
export async function getPlatformClient() {
  const requestId = (await headers()).get('x-request-id') ?? undefined

  if (!process.env.API_INTERNAL_KEY) reportMissingInternalKey()

  return create876PlatformClient({
    apiKey: process.env.INVOICE_API_876_KEY,
    requestId,
  })
}
