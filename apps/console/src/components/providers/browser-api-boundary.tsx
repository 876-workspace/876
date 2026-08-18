'use client'

import { configureBrowserNotepadRoutes } from '@876/widgets/browser'

configureBrowserNotepadRoutes({
  notes: '/api/notes',
  collections: '/api/note-collections',
  adminNotes: '/api/notes/admin',
})

/** Installs Console-owned browser routes for shared first-party UI packages. */
export function BrowserApiBoundary() {
  return null
}
