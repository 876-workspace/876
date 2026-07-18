import 'server-only'

import { getAuthSession, isSignedSession } from '@/lib/auth/session'

/** Member access for Billing Notepad host routes. Feature gate is enforced by the shell; routes require a signed session. */
export async function requireNotepadMember() {
  const session = await getAuthSession()
  if (!isSignedSession(session))
    return {
      userId: null as string | null,
      response: Response.json({ error: 'Unauthorized.' }, { status: 401 }),
    }

  return { userId: session.user.id, response: null }
}
