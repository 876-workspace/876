/**
 * Editor.js ships with light-biased chrome. These rules restyle the sticky
 * notepad body for both light and dark 876 themes using design tokens.
 */
export const NOTEPAD_EDITORJS_THEME_CSS = `
.notepad-editorjs {
  color: var(--foreground, inherit);
  --ne-surface: var(--background, #fff);
  --ne-elevated: var(--popover, #fff);
  --ne-elevated-fg: var(--popover-foreground, #111);
  --ne-muted: var(--muted, #f4f4f5);
  --ne-muted-fg: var(--muted-foreground, #71717a);
  --ne-border: var(--border, rgba(0, 0, 0, 0.12));
  --ne-border-strong: var(--border-strong, rgba(0, 0, 0, 0.2));
  --ne-ring: var(--ring, #3b82f6);
  --ne-accent: var(--primary, #2563eb);
  --ne-fg: var(--foreground, #111);
  --ne-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
}

.dark .notepad-editorjs,
html.dark .notepad-editorjs {
  --ne-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
}

.notepad-editorjs-holder {
  color: var(--ne-fg);
}

.notepad-editorjs-holder .codex-editor {
  color: inherit;
}

.notepad-editorjs-holder .codex-editor__redactor {
  padding-bottom: 2.5rem !important;
}

.notepad-editorjs-holder .ce-block__content,
.notepad-editorjs-holder .ce-toolbar__content {
  max-width: 100%;
  margin-left: 0;
  margin-right: 0;
}

.notepad-editorjs-holder .ce-paragraph,
.notepad-editorjs-holder .ce-header,
.notepad-editorjs-holder .cdx-block,
.notepad-editorjs-holder .cdx-list,
.notepad-editorjs-holder .cdx-checklist__text {
  color: inherit;
}

/* Placeholder */
.notepad-editorjs-holder .ce-paragraph[data-placeholder]:empty::before,
.notepad-editorjs-holder .ce-header[data-placeholder]:empty::before {
  color: var(--ne-muted-fg);
  opacity: 0.85;
}

/* Block selection */
.notepad-editorjs-holder .ce-block--selected .ce-block__content {
  background: color-mix(in oklab, var(--ne-accent) 14%, transparent);
}

.dark .notepad-editorjs-holder .ce-block--selected .ce-block__content,
html.dark .notepad-editorjs-holder .ce-block--selected .ce-block__content {
  background: color-mix(in oklab, var(--ne-accent) 22%, transparent);
}

/* Side toolbar (+ / settings) */
.notepad-editorjs-holder .ce-toolbar__plus,
.notepad-editorjs-holder .ce-toolbar__settings-btn {
  color: var(--ne-muted-fg);
  background: color-mix(in oklab, var(--ne-elevated) 88%, transparent);
  border: 1px solid var(--ne-border);
  box-shadow: none;
}

.notepad-editorjs-holder .ce-toolbar__plus:hover,
.notepad-editorjs-holder .ce-toolbar__settings-btn:hover,
.notepad-editorjs-holder .ce-toolbar__plus--active,
.notepad-editorjs-holder .ce-toolbar__settings-btn--active {
  color: var(--ne-fg);
  background: var(--ne-muted);
  border-color: var(--ne-border-strong);
}

.notepad-editorjs-holder .ce-toolbar__plus svg,
.notepad-editorjs-holder .ce-toolbar__settings-btn svg {
  color: currentColor;
}

.notepad-editorjs-holder .ce-toolbar__actions {
  right: 0;
}

/* Popovers / toolbox / conversion / inline toolbar */
.notepad-editorjs-holder .ce-popover,
.notepad-editorjs-holder .ce-inline-toolbar,
.notepad-editorjs-holder .ce-conversion-toolbar,
.notepad-editorjs-holder .ce-settings,
.notepad-editorjs-holder .ce-toolbox {
  background: var(--ne-elevated) !important;
  color: var(--ne-elevated-fg) !important;
  border: 1px solid var(--ne-border) !important;
  box-shadow: var(--ne-shadow) !important;
}

.notepad-editorjs-holder .ce-popover__container {
  background: transparent;
}

.notepad-editorjs-holder .ce-popover-item,
.notepad-editorjs-holder .ce-inline-toolbar__dropdown,
.notepad-editorjs-holder .ce-inline-tool,
.notepad-editorjs-holder .ce-conversion-tool,
.notepad-editorjs-holder .ce-settings__button {
  color: var(--ne-elevated-fg) !important;
  background: transparent !important;
}

.notepad-editorjs-holder .ce-popover-item:hover,
.notepad-editorjs-holder .ce-popover-item--focused,
.notepad-editorjs-holder .ce-popover-item--active,
.notepad-editorjs-holder .ce-inline-tool:hover,
.notepad-editorjs-holder .ce-inline-tool--active,
.notepad-editorjs-holder .ce-conversion-tool:hover,
.notepad-editorjs-holder .ce-conversion-tool--focused,
.notepad-editorjs-holder .ce-settings__button:hover,
.notepad-editorjs-holder .ce-settings__button--active {
  background: var(--ne-muted) !important;
  color: var(--ne-fg) !important;
}

.notepad-editorjs-holder .ce-popover-item__icon,
.notepad-editorjs-holder .ce-popover-item__title,
.notepad-editorjs-holder .ce-popover-item__secondary-title {
  color: inherit !important;
}

.notepad-editorjs-holder .ce-popover-item__icon {
  background: color-mix(in oklab, var(--ne-muted) 80%, transparent) !important;
  border-color: transparent !important;
  box-shadow: none !important;
}

.notepad-editorjs-holder .ce-popover-item:hover .ce-popover-item__icon,
.notepad-editorjs-holder .ce-popover-item--focused .ce-popover-item__icon {
  background: color-mix(in oklab, var(--ne-accent) 16%, var(--ne-muted)) !important;
}

.notepad-editorjs-holder .ce-popover__nothing-found-message {
  color: var(--ne-muted-fg) !important;
}

/* Search field inside toolbox */
.notepad-editorjs-holder .cdx-search-field {
  background: var(--ne-muted) !important;
  border: 1px solid var(--ne-border) !important;
  color: var(--ne-fg) !important;
}

.notepad-editorjs-holder .cdx-search-field__input {
  color: inherit !important;
  background: transparent !important;
}

.notepad-editorjs-holder .cdx-search-field__input::placeholder {
  color: var(--ne-muted-fg) !important;
}

.notepad-editorjs-holder .cdx-search-field svg {
  color: var(--ne-muted-fg);
}

/* Inline toolbar separators / inputs */
.notepad-editorjs-holder .ce-inline-toolbar__toggler-and-button-wrapper,
.notepad-editorjs-holder .ce-inline-tool-input {
  border-color: var(--ne-border) !important;
  background: var(--ne-elevated) !important;
  color: var(--ne-elevated-fg) !important;
}

.notepad-editorjs-holder .ce-inline-tool-input::placeholder {
  color: var(--ne-muted-fg);
}

/* Checklists */
.notepad-editorjs-holder .cdx-checklist__item-checkbox,
.notepad-editorjs-holder .cdx-checklist__checkbox,
.notepad-editorjs-holder .cdx-checklist__item-checkbox-check {
  border-color: var(--ne-border-strong) !important;
  background: color-mix(in oklab, var(--ne-elevated) 70%, transparent) !important;
}

.notepad-editorjs-holder .cdx-checklist__item--checked .cdx-checklist__item-checkbox,
.notepad-editorjs-holder .cdx-checklist__item--checked .cdx-checklist__checkbox {
  background: var(--ne-accent) !important;
  border-color: var(--ne-accent) !important;
}

.notepad-editorjs-holder .cdx-checklist__item--checked .cdx-checklist__text {
  opacity: 0.72;
}

/* Lists */
.notepad-editorjs-holder .cdx-list__item,
.notepad-editorjs-holder .cdx-list-ordered,
.notepad-editorjs-holder .cdx-list-unordered {
  color: inherit;
}

.notepad-editorjs-holder .cdx-list__item::marker {
  color: var(--ne-muted-fg);
}

.notepad-editorjs-holder .cdx-block {
  padding: 0.15em 0;
}

/* Loader */
.notepad-editorjs-holder .codex-editor__loader {
  background: transparent;
}

.notepad-editorjs-holder .codex-editor__loader::before {
  border-color: color-mix(in oklab, var(--ne-muted-fg) 35%, transparent);
  border-top-color: var(--ne-fg);
}

/* Links inside content */
.notepad-editorjs-holder a {
  color: var(--ne-accent);
}

.dark .notepad-editorjs-holder a,
html.dark .notepad-editorjs-holder a {
  color: color-mix(in oklab, var(--ne-accent) 85%, white 15%);
}
`
