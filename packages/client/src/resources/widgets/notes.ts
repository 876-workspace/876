import type { WidgetsClient } from '@876/widgets/server'

export function createNotesResource(widgets?: WidgetsClient) {
  return widgets?.notes
}
