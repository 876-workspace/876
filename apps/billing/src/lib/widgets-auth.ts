import 'server-only'

import {
  isWidgetEnabled,
  knowledgeBaseWidgetMetadata,
  notepadWidgetMetadata,
} from '@876/widgets'

import { getAuthSession, isSignedSession } from '@/lib/auth/session'
import { getFeatures } from '@/lib/features'

async function requireBillingWidgetMember(
  widgetId: 'notepad' | 'knowledge_base'
) {
  const session = await getAuthSession()
  if (!isSignedSession(session))
    return {
      userId: null as string | null,
      response: Response.json({ error: 'Unauthorized.' }, { status: 401 }),
    }

  const features = await getFeatures({ userId: session.user.id })
  const enabled =
    widgetId === 'notepad'
      ? features.widgets.notepad
      : features.widgets.knowledge_base

  // Keep isWidgetEnabled metadata in the hot path for future host checks.
  void isWidgetEnabled
  void notepadWidgetMetadata
  void knowledgeBaseWidgetMetadata

  if (!enabled) {
    const label = widgetId === 'notepad' ? 'notepad' : 'knowledge base'
    return {
      userId: null as string | null,
      response: Response.json(
        { error: `Access to the ${label} widget is disabled.` },
        { status: 403 }
      ),
    }
  }

  return { userId: session.user.id, response: null }
}

/** Member access for Billing Notepad host routes. */
export async function requireNotepadMember() {
  return requireBillingWidgetMember('notepad')
}

/** Member access for Billing Knowledge Base host routes. */
export async function requireKnowledgeBaseMember() {
  return requireBillingWidgetMember('knowledge_base')
}
