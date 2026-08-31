import 'server-only'

import { create876PlatformClient } from '@876/core/platform'
import * as Sentry from '@sentry/nextjs'
import { headers } from 'next/headers'

/**
 * Every platform endpoint Couriers depends on (routing memberships, app
 * subscriptions, onboarding catalogs) is `AdminDep` and authenticates with the
 * secret `x-internal-key`. When `API_INTERNAL_KEY` is absent the client still
 * builds and every call fails 401 at the edge, which the callers absorb into
 * "no memberships" / "no access" / "setup unavailable" — a misconfigured
 * deployment then looks exactly like a brand-new user. Report it once per
 * isolate so the cause is visible instead of inferred.
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
          'Every AdminDep platform call (routing memberships, app subscriptions, onboarding catalogs) will fail authentication.',
      },
    }
  )
}

/**
 * Server-only factory for the narrow platform bootstrap client. It serves
 * Couriers' routing memberships, feature evaluation, and app-subscription
 * entitlements. Couriers-local records remain behind `service`.
 */
export async function getPlatformClient() {
  const requestId = (await headers()).get('x-request-id') ?? undefined

  if (!process.env.API_INTERNAL_KEY) reportMissingInternalKey()

  return create876PlatformClient({
    apiKey: process.env.API_876_KEY,
    requestId,
  })
}
