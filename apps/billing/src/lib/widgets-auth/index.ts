import 'server-only'

import { getAuthSession, isSignedSession } from '@/lib/auth/session'
import { getFeatures } from '@/lib/features'

/**
 * Member access for Billing Notepad host routes.
 *
 * The dock gate in the shell is UX. This is the guard: `access-control.md` is
 * explicit that hiding a link never replaces one, so the route re-checks the
 * widget feature rather than trusting that the shell declined to render it.
 * Console and Couriers already did; Billing checked only for a signed session,
 * so any signed-in member could reach these routes with the widget disabled.
 *
 * `getFeatures` returns an empty widget list when evaluation fails, so an
 * outage denies rather than grants.
 */
export async function requireNotepadMember() {
  const session = await getAuthSession()
  if (!isSignedSession(session))
    return {
      userId: null as string | null,
      response: Response.json({ error: 'Unauthorized.' }, { status: 401 }),
    }

  const features = await getFeatures({
    userId: session.user.id,
    organizationId: session.user.orgId ?? undefined,
  })
  if (!features.widgets.enabledWidgetIds.includes('notepad'))
    return {
      userId: null as string | null,
      response: Response.json(
        { error: 'Access to the notepad widget is disabled.' },
        { status: 403 }
      ),
    }

  return { userId: session.user.id, response: null }
}
