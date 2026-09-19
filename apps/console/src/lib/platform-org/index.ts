import { crm } from '@/lib/clients/crm'
import { projects } from '@/lib/clients/projects'
import { platform } from '@/lib/clients/platform'
import 'server-only'
import { workspace } from '@/lib/clients/workspace'

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
 * Prepares 876's own Projects tenant. Same shape and same reasoning as the CRM
 * workspace below: Console operates the platform organization's own instance of
 * the product, and preparing it is service infrastructure — it does not grant
 * the 876 Projects product to anyone.
 */
export const ensurePlatformProjectsWorkspace = cache(async () => {
  const organization = await getPlatformOrganization()
  if (!organization) return null

  const result = await projects.tenants.ensure(organization.id)
  return result.error ? null : result.data
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
