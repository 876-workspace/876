import { crm } from '@/lib/services/crm'
import { platform } from '@/lib/services/platform'
import 'server-only'
import { workspace } from '@/lib/services/workspace'

import { cache } from 'react'

/** Resolves the 876 organization whose CRM service workspace Console operates. */
export const getPlatformOrganization = cache(async () => {
  const result = await platform.organizations.retrieve({
    slug: process.env.CONSOLE_PLATFORM_ORG_SLUG ?? 'efesto',
  })
  // Never throw. A misconfigured slug is an operator mistake, and it should
  // render an explanatory empty state on this one surface rather than a 500 on
  // whatever nav click happened to reach it first.
  if (result.error) return null

  return result.data
})

/**
 * Prepares 876's own CRM workspace and its seeded support intake definition.
 * This is service infrastructure only; it does not grant the 876 CRM product.
 */
export const ensurePlatformRequestWorkspace = cache(async () => {
  const organization = await getPlatformOrganization()
  if (!organization) return null

  const result = await crm.ensure(organization.id, undefined, {
    fixtures: ['876_SUPPORT'],
  })
  return result.error ? null : result.data
})
