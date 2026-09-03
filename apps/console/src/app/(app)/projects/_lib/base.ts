import 'server-only'

import { notFound } from 'next/navigation'

import { getPlatformOrganization } from '@/lib/platform-org'

/** Console's own Projects root. Every href in this section hangs off it. */
export const PLATFORM_PROJECTS_BASE = '/projects'

/**
 * The organization whose Projects tenant this section operates.
 *
 * `getPlatformOrganization` returns `null` for a misconfigured
 * `CONSOLE_PLATFORM_ORG_SLUG` rather than throwing, so callers that can render
 * an explanatory empty state should use it directly. This wrapper is for the
 * record routes, where there is no useful page to show without an organization.
 */
export async function requirePlatformProjectsOrgId(): Promise<string> {
  const org = await getPlatformOrganization()
  if (!org) notFound()
  return org.id
}
