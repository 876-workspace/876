import 'server-only'

import { cache } from 'react'

import { getWorkspace } from '@/lib/services/workspace'

/**
 * The organization permission that authorizes changing a member's app access.
 *
 * This is an **organization** permission, not an app permission: deciding who
 * may use Invoice is an organization-governance act, and
 * `.claude/rules/app-access.md` keeps the two planes separate. An app
 * permission never grants it.
 */
export const APP_ASSIGN_PERMISSION = 'apps:assign'

/** The organization permission that authorizes reading the member roster. */
export const MEMBERS_READ_PERMISSION = 'members:read'

export type InvoiceAccessViewer = {
  membershipId: string
  userId: string
  permissions: string[]
  canReadMembers: boolean
  canManageAppAccess: boolean
}

/**
 * The result of resolving the acting member.
 *
 * "You may not" and "we could not tell" are different answers, and a caller
 * owes the operator different things for each: a denial is a scoped access
 * state, an outage is a notice beside otherwise intact chrome. Collapsing both
 * into `null` left every caller with `notFound()`, which is wrong for both —
 * see `.claude/rules/error-handling.md`.
 */
export type InvoiceAccessOutcome =
  | { status: 'ok'; viewer: InvoiceAccessViewer }
  | { status: 'unavailable'; code: string }

/**
 * Resolves the acting member's effective organization permissions.
 *
 * Memoized per request because the settings shell, the list, and every tab need
 * it; `React.cache` compares with `Object.is`, so this takes the primitive
 * organization id rather than an options object, which would never hit.
 *
 * Permission resolution fails closed: an `ok` outcome whose viewer holds
 * nothing grants nothing. An `unavailable` outcome is an infrastructure answer,
 * not an authorization one — it must never be read as permission to proceed.
 */
export const resolveInvoiceAccessViewer = cache(
  async function resolveInvoiceAccessViewer(
    organizationId: string
  ): Promise<InvoiceAccessOutcome> {
    const workspace = await getWorkspace()
    const result = await workspace.members.retrieveMe(organizationId)

    if (result.error || !result.data)
      return {
        status: 'unavailable',
        code: result.error?.code ?? 'platform/unavailable',
      }

    const permissions = result.data.permissions
    return {
      status: 'ok',
      viewer: {
        membershipId: result.data.id,
        userId: result.data.user_id,
        permissions,
        canReadMembers: permissions.includes(MEMBERS_READ_PERMISSION),
        canManageAppAccess: permissions.includes(APP_ASSIGN_PERMISSION),
      },
    }
  }
)

/** True when the outcome resolved and the viewer holds the permission. */
export function holds(
  outcome: InvoiceAccessOutcome,
  select: (viewer: InvoiceAccessViewer) => boolean
): boolean {
  return outcome.status === 'ok' && select(outcome.viewer)
}

/**
 * Authorizes a route handler that changes app access.
 *
 * Returns a `Response` to return as-is when the caller may not act, and the
 * viewer otherwise. It never redirects: per `.claude/rules/access-control.md` an
 * API authorization failure is a value the client renders in place, not a
 * navigation that discards the operator's work.
 *
 * A resolution outage answers 503 rather than 403, so a caller is not told they
 * lack a permission when the truth is that nothing could be checked. Either way
 * nothing proceeds, and the identity API enforces the same permission on every
 * write independently.
 */
export async function requireAppAccessManager(
  organizationId: string
): Promise<
  | { viewer: InvoiceAccessViewer; response: null }
  | { viewer: null; response: Response }
> {
  const outcome = await resolveInvoiceAccessViewer(organizationId)

  if (outcome.status === 'unavailable')
    return {
      viewer: null,
      response: Response.json(
        {
          data: null,
          error: {
            code: 'invoice/access-unavailable',
            message: 'Access could not be verified. Try again.',
          },
        },
        { status: 503 }
      ),
    }

  if (!outcome.viewer.canManageAppAccess)
    return {
      viewer: null,
      response: Response.json(
        {
          data: null,
          error: {
            code: 'invoice/forbidden',
            message: 'You do not have permission to manage app access.',
          },
        },
        { status: 403 }
      ),
    }

  return { viewer: outcome.viewer, response: null }
}
