import 'server-only'

import { cache } from 'react'

import { CRM_APP_SLUG } from '@/lib/crm-app'
import { getPlatformClient } from './platform'

/**
 * Resolves this app's platform app id for one organization.
 *
 * The id is generated per environment, so it cannot be a constant — a
 * hard-coded value is wrong everywhere except the machine it was copied from,
 * and produces a 404 that reads as "no access" rather than "wrong id".
 *
 * The organization's entitlement already carries it, and that call is memoized
 * per request, so this costs nothing beyond what the context resolver already
 * does.
 */
export const resolvePlatformAppId = cache(async function resolvePlatformAppId(
  organizationId: string
): Promise<string | null> {
  const platform = await getPlatformClient()
  const subscription = await platform.subscriptions.retrieve({
    organizationId,
    appSlug: CRM_APP_SLUG,
  })

  if (subscription.error) return null
  return subscription.data?.app_id ?? null
})
