import 'server-only'

import {
  create876ProjectsPortalClient,
  type ProjectsPortalClient,
} from '@876/projects/portal'

function resolveBaseUrl(): string {
  return (
    process.env.PROJECTS_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_PROJECTS_API_URL?.trim() ||
    'http://localhost:4030'
  )
}

/**
 * Session-tier portal access to Projects.
 *
 * The portal route family resolves a client grant for the acting user, so
 * every call carries the signed-in user's id alongside the service
 * credential. This client is the only Projects client portal code may use:
 * the internal projects service client never serves
 * portal callers and must not be imported under `app/portal/**` or
 * `app/api/portal/**`.
 */
export function getPortalClient(
  actingUserId: string
): ProjectsPortalClient {
  const internalKey = process.env.PROJECTS_INTERNAL_KEY?.trim()
  if (!internalKey) throw new Error('PROJECTS_INTERNAL_KEY is required')
  return create876ProjectsPortalClient({
    baseUrl: resolveBaseUrl(),
    internalKey,
    actingUserId,
  })
}
