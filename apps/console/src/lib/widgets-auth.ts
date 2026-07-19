import 'server-only'

import {
  getRequiredWidgetFeatureSlugs,
  knowledgeBaseWidgetMetadata,
  notepadWidgetMetadata,
} from '@876/widgets'

import { getConsoleFeatures } from '@/lib/features'
import { consoleWidgetCatalog } from '@/components/widgets/widget-catalog'
import { getAuthSession, isSignedSession } from '@/lib/auth/session'

async function requireWidgetMember(widgetId: 'notepad' | 'knowledge_base') {
  const session = await getAuthSession()
  if (!isSignedSession(session))
    return {
      userId: null as string | null,
      response: Response.json({ error: 'Unauthorized.' }, { status: 401 }),
    }

  const features = await getConsoleFeatures({
    userId: session.user.id,
    widgets: consoleWidgetCatalog,
  })
  const enabled = new Set(features.enabledWidgetIds)
  if (!enabled.has(widgetId)) {
    const label = widgetId === 'notepad' ? 'notepad' : 'knowledge base'
    return {
      userId: null as string | null,
      response: Response.json(
        { error: `Access to the ${label} widget is disabled.` },
        { status: 403 }
      ),
    }
  }

  const metadata =
    widgetId === 'notepad' ? notepadWidgetMetadata : knowledgeBaseWidgetMetadata
  void getRequiredWidgetFeatureSlugs(metadata, 'console')

  return { userId: session.user.id, response: null }
}

export async function requireNotepadMember() {
  return requireWidgetMember('notepad')
}

export async function requireKnowledgeBaseMember() {
  return requireWidgetMember('knowledge_base')
}
