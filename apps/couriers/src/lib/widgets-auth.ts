import 'server-only'

import { getManageContext } from '@/lib/auth/manage-context'
import { getFeatures } from '@/lib/features'

export async function requireNotepadMember() {
  const context = await getManageContext()
  if (!context)
    return {
      userId: null as string | null,
      response: Response.json({ error: 'Unauthorized.' }, { status: 401 }),
    }

  // Notes are user-owned; any active workspace member may use the widget —
  // this must stay in sync with the dock gate in the private layout.
  if (context.accessStatus !== 'active')
    return {
      userId: null as string | null,
      response: Response.json(
        { error: 'Access to the Couriers workspace is disabled.' },
        { status: 403 }
      ),
    }

  const features = await getFeatures({
    userId: context.userId,
    organizationId: context.orgId,
  })
  if (!features.enabledWidgetIds.includes('notepad'))
    return {
      userId: null as string | null,
      response: Response.json(
        { error: 'Access to the notepad widget is disabled.' },
        { status: 403 }
      ),
    }

  return { userId: context.userId, response: null }
}
