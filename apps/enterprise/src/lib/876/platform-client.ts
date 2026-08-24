import 'server-only'

import { create876PlatformClient } from '@876/core/platform'
import * as Sentry from '@sentry/nextjs'
import { headers } from 'next/headers'

/**
 * Every platform endpoint Enterprise depends on (routing memberships, the
 * auth-routing user, feature evaluation) is `AdminDep` and authenticates with
 * the secret `x-internal-key`. When `API_INTERNAL_KEY` is absent the client
 * still builds and every call fails 401, which the guards surface as a thrown
 * Server Components render error — the app authenticates and then refuses to
 * render any page. Report it once per isolate so the cause is visible instead
 * of inferred from a minified React error.
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
          'Every AdminDep platform call (routing memberships, auth-routing user, feature evaluation) will fail authentication.',
      },
    }
  )
}

/**
 * Creates Enterprise's request-scoped client for privileged platform reads.
 * Routing and feature evaluation use the internal-key tier so a stale
 * user bearer token cannot block an otherwise valid signed session.
 */
export async function getPlatformClient() {
  const requestId = (await headers()).get('x-request-id') ?? undefined

  if (!process.env.API_INTERNAL_KEY) reportMissingInternalKey()

  return create876PlatformClient({
    apiKey: process.env.API_876_KEY,
    requestId,
  })
}
