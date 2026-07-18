import { NotepadWidget as SharedNotepadWidget } from '@876/widgets/react'
import type { WidgetPanelProps } from './widgets-config'

/**
 * Console host for the shared account-owned Notepad widget. Live Logs remains
 * Console-local (host distribution, external dataOwner) and is never exported
 * through the shared widget package.
 */
export function NotepadWidget({}: WidgetPanelProps) {
  return <SharedNotepadWidget />
}
