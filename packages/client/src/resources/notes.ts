import type { WidgetsClient } from '@876/widgets/server'
import { browserNotes } from '@876/widgets/browser'

export function createNotesResource(widgets: WidgetsClient | undefined) {
  if (widgets) return widgets.notes
  // browser fallback
  return {
    list: browserNotes.list,
    create: browserNotes.create,
    update: browserNotes.update,
    delete: browserNotes.delete,
  } as unknown as WidgetsClient['notes']
}
