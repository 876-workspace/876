import type { WidgetsClient } from '@876/widgets/server'

export function createCollectionsResource(widgets?: WidgetsClient) {
  return widgets?.collections
}
