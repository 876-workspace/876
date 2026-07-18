import 'server-only'

import {
  getRequiredWidgetFeatureSlugs,
  notepadWidgetMetadata,
} from '@876/widgets'

import { getConsoleFeatures } from '@/lib/features'
import { consoleWidgetCatalog } from '@/components/widgets/widget-catalog'
import { getAuthSession, isSignedSession } from '@/lib/auth/session'

export async function requireNotepadMember() {
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
  const required = getRequiredWidgetFeatureSlugs(
    notepadWidgetMetadata,
    'console'
  )
  const enabled = new Set(features.enabledWidgetIds)
  // Prefer dock evaluation (already AND of platform+app flags via isWidgetEnabled).
  if (!enabled.has('notepad')) {
    // Fall back: if evaluate returned empty widget list for other reasons, still
    // surface a clean forbidden for missing notepad access.
    return {
      userId: null as string | null,
      response: Response.json(
        { error: 'Access to the notepad widget is disabled.' },
        { status: 403 }
      ),
    }
  }

  void required
  return { userId: session.user.id, response: null }
}
