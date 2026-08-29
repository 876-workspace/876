import 'server-only'

import { can, hasFeature } from '@876/core/access'

import {
  resolveAccessContext,
} from '@/lib/auth/access-context'
import { findConsoleAccess } from '@/lib/auth/guards'
import { getAuthSession, isSignedSession } from '@/lib/auth/session'
import { errorResponse } from '@/lib/errors'
import { CONSOLE_ACCESS_PERMISSION } from '@/lib/permissions'
import type { Access, SessionUser } from '@/types/auth'

type Authorized = {
  caller: Access
  sessionUser: SessionUser
  response: null
}
type Rejected = { caller: null; sessionUser: null; response: Response }

type RouteRequirement = { permission?: string; feature?: string }

function unauthorized(): Rejected {
  return {
    caller: null,
    sessionUser: null,
    response: Response.json({ error: 'Unauthorized.' }, { status: 401 }),
  }
}

function forbidden(): Rejected {
  return {
    caller: null,
    sessionUser: null,
    response: errorResponse('error/forbidden'),
  }
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
