import 'server-only'

import { cache } from 'react'

import { getWorkspace } from '@/lib/services/workspace'

/**
 * The organization permission that authorizes changing a member's app access.
 *
 * This is an **organization** permission, not a CRM app permission: deciding who
 * may use CRM is an organization-governance act, and `.claude/rules/app-access.md`
 * keeps the two planes separate. A CRM app permission never grants it.
 */
export const APP_ASSIGN_PERMISSION = 'apps:assign'

/** The organization permission that authorizes reading the member roster. */
export const MEMBERS_READ_PERMISSION = 'members:read'

export type CrmAccessViewer = {
  membershipId: string
  userId: string
  permissions: string[]
  canReadMembers: boolean
  canManageAppAccess: boolean
}

/**
 * Resolves the acting member's effective organization permissions.
 *
 * Memoized per request because the settings shell, the list, and each tab all
 * need it; `React.cache` compares with `Object.is`, so this takes the primitive
 * organization id rather than an options object, which would never hit.
 *
 * Returns `null` when the caller is not a member of the organization or the
 * platform cannot answer. Callers must treat `null` as "no access": this
 * resolution can only *grant*, so it fails closed, unlike the subtractive
 * employment check described in `.claude/rules/access-control.md`.
 */
export const resolveCrmAccessViewer = cache(
  async function resolveCrmAccessViewer(
    organizationId: string
  ): Promise<CrmAccessViewer | null> {
    const workspace = await getWorkspace()
    const result = await workspace.members.retrieveMe(organizationId)
    if (result.error || !result.data) return null

    const permissions = result.data.permissions
    return {
      membershipId: result.data.id,
      userId: result.data.user_id,
      permissions,
      canReadMembers: permissions.includes(MEMBERS_READ_PERMISSION),
      canManageAppAccess: permissions.includes(APP_ASSIGN_PERMISSION),
    }
  }
)

/**
 * Authorizes a route handler that changes app access.
 *
 * Returns a 403 `Response` to return as-is when the caller may not act, and the
 * viewer otherwise. It never redirects: per `.claude/rules/access-control.md` an
 * API authorization failure is a value the client renders in place, not a
 * navigation that throws away the operator's work.
 *
 * This is the app's own gate. The identity API independently enforces the same
 * permission on every write, so a gap here withholds a control — it cannot widen
 * access.
 */
export async function requireAppAccessManager(
  organizationId: string
): Promise<
  | { viewer: CrmAccessViewer; response: null }
  | { viewer: null; response: Response }
> {
  const viewer = await resolveCrmAccessViewer(organizationId)
  if (!viewer?.canManageAppAccess)
    return {
      viewer: null,
      response: Response.json(
        {
          data: null,
          error: {
            code: 'crm/forbidden',
            message: 'You do not have permission to manage app access.',
          },
        },
        { status: 403 }
      ),
    }

  return { viewer, response: null }
}
