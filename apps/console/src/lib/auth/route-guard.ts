import 'server-only'

import { can, hasFeature } from '@876/core/access'

import { resolveAccessContext } from '@/lib/auth/access-context'
import { findConsoleAccess } from '@/lib/auth/guards'
import { getAuthSession, isSignedSession } from '@/lib/auth/session'
import { getError } from '@/lib/errors'
import { CONSOLE_ACCESS_PERMISSION } from '@/lib/permissions'
import type { Access, SessionUser } from '@/types/auth'

type Authorized = {
  caller: Access
  sessionUser: SessionUser
  response: null
}
type Rejected = { caller: null; sessionUser: null; response: Response }

type RouteRequirement = { permission?: string; feature?: string }

/**
 * Rejections must carry the canonical `{ data, error }` envelope.
 *
 * The browser client validates the envelope before it reads the error, and a
 * body carrying only `error` fails that check — so every 401 and 403 reached
 * the user as `client/invalid-response`, "The server returned an invalid
 * response. Please try again." A permission denial then read as a server
 * malfunction and invited a retry that could never succeed.
 */
function rejection(code: string, status: number, message: string): Rejected {
  return {
    caller: null,
    sessionUser: null,
    response: Response.json(
      { data: null, error: { code, message } },
      { status }
    ),
  }
}

function unauthorized(): Rejected {
  const { code, message, httpStatus } = getError('error/unauthorized')
  return rejection(code, httpStatus, message)
}

function forbidden(): Rejected {
  const { code, message, httpStatus } = getError('error/forbidden')
  return rejection(code, httpStatus, message)
}

async function requireCapability(
  requirement: RouteRequirement
): Promise<Authorized | Rejected> {
  const session = await getAuthSession()
  if (!isSignedSession(session)) return unauthorized()

  const context = await resolveAccessContext(session.user.id)
  const caller = await findConsoleAccess(session.user.id)
  if (
    !context ||
    !caller ||
    caller.status !== 'active' ||
    !can(context, CONSOLE_ACCESS_PERMISSION)
  )
    return forbidden()

  if (requirement.permission && !can(context, requirement.permission))
    return forbidden()
  if (requirement.feature && !hasFeature(context, requirement.feature))
    return forbidden()

  return { caller, sessionUser: session.user, response: null }
}

export function requireConsolePermission(
  permission: string
): Promise<Authorized | Rejected> {
  return requireCapability({ permission })
}

export function requireConsoleFeature(
  feature: string
): Promise<Authorized | Rejected> {
  return requireCapability({ feature })
}

export function requireConsoleCapability(
  requirement: RouteRequirement
): Promise<Authorized | Rejected> {
  return requireCapability(requirement)
}

/**
 * Authorizes a Console operator to act on an organization's CRM data.
 *
 * Console acts at the **operator tier** — on 876's own authority, across every
 * organization, without an organizational grant. Its Console RBAC permission is
 * therefore the whole authorization decision, exactly as
 * `.claude/rules/access-tiers.md` requires.
 *
 * This deliberately does **not** require the operator to hold an app membership
 * inside the target organization. That earlier design made 876's ability to
 * support a customer depend on a grant that customer could revoke, and it could
 * never work cross-org: an operator helping a customer will not be a member of
 * that customer's CRM. In practice it denied every request-status edit outside
 * the operator's own workspace.
 *
 * `crmOperation` no longer gates access. It is retained because every call site
 * already names the operation it is about to perform, which is exactly what the
 * audit record needs — operator access skips organizational consent, not
 * accountability.
 */
export async function requireConsoleCrmPermission(
  _organizationId: string,
  _crmOperation: string
): Promise<Authorized | Rejected> {
  return requireConsolePermission('crm/requests.view')
}
