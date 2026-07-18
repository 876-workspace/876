import 'server-only'

import { findActiveOrgMembership, hasOrgPermission } from '@/lib/auth/guards'
import { getAuthSession, isSignedSession } from '@/lib/auth/session'

type ActiveMembership = NonNullable<
  Awaited<ReturnType<typeof findActiveOrgMembership>>
>

type OrgRequestAuth =
  | { membership: ActiveMembership; response: null }
  | { membership: null; response: Response }

/**
 * Shared route-handler authorization for org-scoped mutations: resolves the
 * session, the caller's active membership in `slug`, and checks `permission`.
 * The admin client these handlers call bypasses the API's own permission
 * enforcement, so this check is the sole authorization gate.
 */
export async function authorizeOrgRequest(
  slug: string,
  permission: string
): Promise<OrgRequestAuth> {
  const session = await getAuthSession()
  if (!isSignedSession(session)) {
    return {
      membership: null,
      response: Response.json({ error: 'Not authenticated.' }, { status: 401 }),
    }
  }

  const membership = await findActiveOrgMembership(session.user.id, slug)
  if (!membership) {
    return {
      membership: null,
      response: Response.json(
        { error: 'No access to this organization.' },
        { status: 403 }
      ),
    }
  }

  if (!hasOrgPermission(membership, permission)) {
    return {
      membership: null,
      response: Response.json(
        { error: 'You do not have permission to perform this action.' },
        { status: 403 }
      ),
    }
  }

  return { membership, response: null }
}
