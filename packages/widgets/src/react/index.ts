export { NotepadIcon } from './notepad-icon'
export { NotepadWidget, NotepadWidgetPanel } from './notepad-widget'
export { SharedWidgetDock } from './widget-dock'
export { WidgetPanelSkeleton } from './widget-loading'
export { WidgetAuthBoundary, WidgetBackendProvider } from './widget-provider'
export { ChatRail } from './chat-rail'
export type { ChatRailProps } from './chat-rail'
export { useWidgetPanelLifecycle, WidgetPopout } from './widget-popout'
// Presentation helpers, so a host (Console's admin data view) can render a
// note the way the widget does instead of re-deriving colours and body text.
export {
  DEFAULT_NOTE_COLOR,
  NOTE_COLORS,
  NOTE_STICKY_COLOR_CSS,
  getNoteColorPalette,
  getNoteCharacterCount,
  getNotePreview,
  getNoteWordCount,
  noteColorCssVars,
  resolveNoteColor,
} from './notepad-format'
export type { NoteColor } from './notepad-format'
export type {
  WidgetPanelPresentation,
  WidgetPopoutSide,
  WidgetPopoutSize,
  WidgetTooltipSide,
} from './widget-popout'
