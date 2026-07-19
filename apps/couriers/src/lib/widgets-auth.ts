import 'server-only'

import { getManageContext } from '@/lib/auth/manage-context'
import { getFeatures } from '@/lib/features'

async function requireCouriersWidgetMember(
  widgetId: 'notepad' | 'knowledge_base'
) {
  const context = await getManageContext()
  if (!context)
    return {
      userId: null as string | null,
      response: Response.json({ error: 'Unauthorized.' }, { status: 401 }),
    }

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
  if (!features.enabledWidgetIds.includes(widgetId)) {
    const label = widgetId === 'notepad' ? 'notepad' : 'knowledge base'
    return {
      userId: null as string | null,
      response: Response.json(
        { error: `Access to the ${label} widget is disabled.` },
        { status: 403 }
      ),
    }
  }

  return { userId: context.userId, response: null }
}

export async function requireNotepadMember() {
  return requireCouriersWidgetMember('notepad')
}

export async function requireKnowledgeBaseMember() {
  return requireCouriersWidgetMember('knowledge_base')
}
