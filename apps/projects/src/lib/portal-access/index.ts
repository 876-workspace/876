import 'server-only'

import { apiJson } from '@876/core/api'
import type { PlatformRoutingMembership } from '@876/core/platform'
import type { ProjectsPortalClient } from '@876/projects/portal'
import { redirect } from 'next/navigation'

import { getAuthSession, isSignedSession } from '@/lib/auth/session'
import { getPlatformClient } from '@/lib/clients/platform'
import { getPortalClient } from '@/lib/clients/portal'

import type { PortalAccess } from '@/types/access'

type PortalProbeClient = Pick<ProjectsPortalClient, 'listIssues'>

type PortalProbe = (
  client: PortalProbeClient,
  orgId: string,
  projectId: string
) => Promise<boolean>

type PortalClientFactory = (actingUserId: string) => PortalProbeClient

function isUsable(membership: PlatformRoutingMembership): boolean {
  return (
    membership.status === 'active' &&
    membership.organization.status === 'active'
  )
}

/**
 * Probes one organization for a live client grant by issuing a minimal
 * portal read. Any failure denies: without a grant the portal answers 404,
 * and an outage must not read as access.
 */
export async function probePortalGrant(
  client: PortalProbeClient,
  orgId: string,
  projectId: string
): Promise<boolean> {
  const result = await client.listIssues(orgId, projectId, { limit: 1 })
  return result.error === null && result.data !== null
}

/**
 * Resolves the organization through which the user holds an active client
 * grant for the project. The grant is resolved through the portal client
 * only — never through the internal member permission — so internal members without a
 * grant and holders of revoked grants are both denied.
 */
export async function resolvePortalGrant(input: {
  projectId: string
  userId: string
  orgIds: readonly string[]
  createClient?: PortalClientFactory
  probe?: PortalProbe
}): Promise<PortalAccess | null> {
  const createClient = input.createClient ?? getPortalClient
  const probe = input.probe ?? probePortalGrant
  const client = createClient(input.userId)
  for (const orgId of input.orgIds) {
    let granted = false
    try {
      granted = await probe(client, orgId, input.projectId)
    } catch {
      granted = false
    }
    if (granted) return { orgId, userId: input.userId }
  }
  return null
}

async function listCandidateOrgIds(userId: string): Promise<string[]> {
  const platform = await getPlatformClient()
  const memberships = await platform.memberships.listRouting({
    userId,
    status: 'active',
  })
  if (memberships.error || !memberships.data) return []
  const ordered = memberships.data.data.filter(isUsable)
  return [...new Set(ordered.map((membership) => membership.organization.id))]
}

/**
 * Page guard for `app/portal/[projectId]/**`. Signed-in session plus an
 * active client grant; anything else redirects. It deliberately does not
 * consult the internal member permission: portal callers are clients, not members.
 */
export async function requirePortalAccess(
  projectId: string
): Promise<PortalAccess> {
  const session = await getAuthSession()
  if (!isSignedSession(session)) redirect('/login')
  const orgIds = await listCandidateOrgIds(session.user.id)
  const grant = await resolvePortalGrant({
    projectId,
    userId: session.user.id,
    orgIds,
  })
  if (!grant) redirect('/no-access')
  return grant
}

/**
 * Route-handler guard for `app/api/portal/[projectId]/**`. Answers with a
 * status instead of redirecting; a revoked or missing grant reads as 404 so
 * grant existence never leaks.
 */
export async function resolvePortalApiAccess(
  projectId: string
): Promise<
  | { access: PortalAccess; response?: undefined }
  | { access?: undefined; response: Response }
> {
  const session = await getAuthSession()
  if (!isSignedSession(session))
    return {
      response: apiJson({ error: 'Unauthorized.' }, { status: 401 }),
    }
  const orgIds = await listCandidateOrgIds(session.user.id)
  const grant = await resolvePortalGrant({
    projectId,
    userId: session.user.id,
    orgIds,
  })
  if (!grant)
    return {
      response: apiJson({ error: 'Not found.' }, { status: 404 }),
    }
  return { access: grant }
}
