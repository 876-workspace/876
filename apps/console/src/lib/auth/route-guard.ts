import 'server-only'

import { findConsoleAccess, hasPermission } from './guards'
import type { Access, SessionUser } from '@/types/auth'
import { getAuthSession, isSignedSession } from './session'

type Authorized = {
  caller: Access
  sessionUser: SessionUser
  response: null
}
type Rejected = { caller: null; sessionUser: null; response: Response }

export async function requireConsolePermission(
  permission: string
): Promise<Authorized | Rejected> {
  const session = await getAuthSession()
  if (!isSignedSession(session)) {
    return {
      caller: null,
      sessionUser: null,
      response: Response.json({ error: 'Unauthorized.' }, { status: 401 }),
    }
  }

  const caller = await findConsoleAccess(session.user.id)
  if (
    !caller ||
    caller.status !== 'active' ||
    !hasPermission(caller, permission)
  ) {
    return {
      caller: null,
      sessionUser: null,
      response: Response.json(
        { error: 'Insufficient permissions.' },
        { status: 403 }
      ),
    }
  }

  return { caller, sessionUser: session.user, response: null }
}
