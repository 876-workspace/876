import type { WidgetsClient } from '@876/widgets/server'
import { browserCollections } from '@876/widgets/browser'

export function createCollectionsResource(widgets: WidgetsClient | undefined) {
  if (widgets) return widgets.collections
  return browserCollections as unknown as WidgetsClient['collections']
}
