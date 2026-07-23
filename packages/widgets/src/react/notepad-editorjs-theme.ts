/**
 * Editor.js ships with light-biased chrome. These rules restyle the sticky
 * notepad body for both light and dark 876 themes using design tokens.
 *
 * Plugin dropdowns (toolbox / settings / conversion / inline) get their own
 * solid elevated surface so sticky-note ink/background never bleeds through.
 */
export const NOTEPAD_EDITORJS_THEME_CSS = `
.notepad-editorjs {
  color: var(--foreground, inherit);
  --ne-surface: var(--background, #fff);
  /* Opaque elevated panel — independent of sticky-note palette. */
  --ne-elevated: var(--popover, #ffffff);
  --ne-elevated-fg: var(--popover-foreground, #18181b);
  --ne-muted: var(--muted, #f4f4f5);
  --ne-muted-fg: var(--muted-foreground, #71717a);
  --ne-border: var(--border, rgba(24, 24, 27, 0.12));
  --ne-border-strong: var(--border-strong, rgba(24, 24, 27, 0.22));
  --ne-ring: var(--ring, #3b82f6);
  --ne-accent: var(--primary, #2563eb);
  --ne-fg: var(--foreground, #18181b);
  --ne-shadow: 0 10px 28px rgba(15, 23, 42, 0.14);
  /* Editor.js built-in CSS vars (hardcoded light in the library). */
  --ne-ej-bg: var(--ne-elevated);
  --ne-ej-fg: var(--ne-elevated-fg);
  --ne-ej-fg-secondary: var(--ne-muted-fg);
  --ne-ej-border: var(--ne-border);
  --ne-ej-item-hover: var(--ne-muted);
  --ne-ej-item-focus: color-mix(in oklab, var(--ne-accent) 12%, transparent);
  --ne-ej-icon-active-bg: color-mix(in oklab, var(--ne-accent) 14%, transparent);
  --ne-ej-icon-active-fg: var(--ne-accent);
}

.dark .notepad-editorjs,
html.dark .notepad-editorjs {
  /* Solid slate panel so menus stay readable on dark sticky notes. */
  --ne-elevated: var(--popover, oklch(0.27 0.02 262));
  --ne-elevated-fg: var(--popover-foreground, oklch(0.96 0.01 262));
  --ne-muted: var(--muted, oklch(0.32 0.02 262));
  --ne-muted-fg: var(--muted-foreground, oklch(0.72 0.02 262));
  --ne-border: var(--border, oklch(1 0 0 / 0.12));
  --ne-border-strong: var(--border-strong, oklch(1 0 0 / 0.2));
  --ne-fg: var(--foreground, oklch(0.96 0.01 262));
  --ne-shadow: 0 14px 36px rgba(0, 0, 0, 0.55);
  --ne-ej-bg: var(--ne-elevated);
  --ne-ej-fg: var(--ne-elevated-fg);
  --ne-ej-fg-secondary: var(--ne-muted-fg);
  --ne-ej-border: var(--ne-border);
  --ne-ej-item-hover: var(--ne-muted);
  --ne-ej-item-focus: color-mix(in oklab, var(--ne-accent) 22%, transparent);
  --ne-ej-icon-active-bg: color-mix(in oklab, var(--ne-accent) 24%, transparent);
  --ne-ej-icon-active-fg: color-mix(in oklab, var(--ne-accent) 80%, white 20%);
}

.notepad-editorjs-holder {
  color: var(--ne-fg);
  /* Keep absolutely-positioned toolbars/popovers paint above note content. */
  position: relative;
  z-index: 0;
}

.notepad-editorjs-holder .codex-editor {
  color: inherit;
  position: relative;
  z-index: 0;
}

.notepad-editorjs-holder .codex-editor__toolbar,
.notepad-editorjs-holder .ce-toolbar {
  z-index: 30;
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

/*
 * Plugin dropdowns — solid elevated surface of their own.
 * Editor.js hardcodes light tokens on .ce-popover; rebind those vars so
 * nested items (hover/focus/secondary text) stay legible in both themes.
 */
.notepad-editorjs-holder .ce-popover,
.notepad-editorjs-holder .ce-inline-toolbar,
.notepad-editorjs-holder .ce-conversion-toolbar,
.notepad-editorjs-holder .ce-settings,
.notepad-editorjs-holder .ce-toolbox {
  --color-background: var(--ne-ej-bg) !important;
  --color-text-primary: var(--ne-ej-fg) !important;
  --color-text-secondary: var(--ne-ej-fg-secondary) !important;
  --color-border: var(--ne-ej-border) !important;
  --color-border-icon: color-mix(in oklab, var(--ne-ej-border) 80%, transparent) !important;
  --color-border-icon-disabled: var(--ne-ej-border) !important;
  --color-background-item-hover: var(--ne-ej-item-hover) !important;
  --color-background-item-focus: var(--ne-ej-item-focus) !important;
  --color-background-icon-active: var(--ne-ej-icon-active-bg) !important;
  --color-text-icon-active: var(--ne-ej-icon-active-fg) !important;
  --color-shadow: color-mix(in oklab, black 18%, transparent) !important;
  --color-shadow-item-focus: color-mix(in oklab, var(--ne-accent) 18%, transparent) !important;
  color: var(--ne-ej-fg) !important;
  z-index: 40;
}

.notepad-editorjs-holder .ce-popover__container,
.notepad-editorjs-holder .ce-inline-toolbar,
.notepad-editorjs-holder .ce-conversion-toolbar,
.notepad-editorjs-holder .ce-settings,
.notepad-editorjs-holder .ce-toolbox {
  background: var(--ne-ej-bg) !important;
  color: var(--ne-ej-fg) !important;
  border: 1px solid var(--ne-ej-border) !important;
  box-shadow: var(--ne-shadow) !important;
  /* Do not inherit sticky-note ink into menu items. */
  isolation: isolate;
}

/* Nested popovers (plugin sub-menus) need the same solid panel. */
.notepad-editorjs-holder .ce-popover--nested .ce-popover__container,
.notepad-editorjs-holder .ce-popover--inline .ce-popover--nested .ce-popover__container {
  background: var(--ne-ej-bg) !important;
  color: var(--ne-ej-fg) !important;
  border: 1px solid var(--ne-ej-border) !important;
  box-shadow: var(--ne-shadow) !important;
}

.notepad-editorjs-holder .ce-popover__items,
.notepad-editorjs-holder .ce-popover__custom-content {
  background: transparent;
  color: inherit;
}

.notepad-editorjs-holder .ce-popover-item,
.notepad-editorjs-holder .ce-inline-toolbar__dropdown,
.notepad-editorjs-holder .ce-inline-tool,
.notepad-editorjs-holder .ce-conversion-tool,
.notepad-editorjs-holder .ce-settings__button,
.notepad-editorjs-holder .cdx-settings-button {
  color: var(--ne-ej-fg) !important;
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
.notepad-editorjs-holder .ce-settings__button--active,
.notepad-editorjs-holder .cdx-settings-button:hover,
.notepad-editorjs-holder .cdx-settings-button--active {
  background: var(--ne-ej-item-hover) !important;
  color: var(--ne-ej-fg) !important;
}

.notepad-editorjs-holder .ce-popover-item__icon,
.notepad-editorjs-holder .ce-popover-item__title,
.notepad-editorjs-holder .ce-popover-header__text,
.notepad-editorjs-holder .ce-popover-header__back-button {
  color: inherit !important;
}

.notepad-editorjs-holder .ce-popover-item__secondary-title {
  color: var(--ne-ej-fg-secondary) !important;
  opacity: 1 !important;
}

.notepad-editorjs-holder .ce-popover-item__icon {
  background: color-mix(in oklab, var(--ne-ej-item-hover) 90%, transparent) !important;
  border-color: transparent !important;
  box-shadow: none !important;
  color: var(--ne-ej-fg) !important;
}

.notepad-editorjs-holder .ce-popover-item__icon svg,
.notepad-editorjs-holder .ce-inline-tool svg,
.notepad-editorjs-holder .ce-conversion-tool svg,
.notepad-editorjs-holder .ce-settings__button svg,
.notepad-editorjs-holder .cdx-settings-button svg {
  color: currentColor !important;
  fill: currentColor;
}

.notepad-editorjs-holder .ce-popover-item:hover .ce-popover-item__icon,
.notepad-editorjs-holder .ce-popover-item--focused .ce-popover-item__icon {
  background: var(--ne-ej-icon-active-bg) !important;
  color: var(--ne-ej-icon-active-fg) !important;
}

.notepad-editorjs-holder .ce-popover-item-separator__line {
  background: var(--ne-ej-border) !important;
}

.notepad-editorjs-holder .ce-popover__nothing-found-message {
  color: var(--ne-ej-fg-secondary) !important;
}

.notepad-editorjs-holder .ce-popover__overlay {
  background: color-mix(in oklab, black 28%, transparent) !important;
}

/* Search field inside toolbox */
.notepad-editorjs-holder .cdx-search-field {
  background: var(--ne-ej-item-hover) !important;
  border: 1px solid var(--ne-ej-border) !important;
  color: var(--ne-ej-fg) !important;
}

.notepad-editorjs-holder .cdx-search-field__input {
  color: inherit !important;
  background: transparent !important;
}

.notepad-editorjs-holder .cdx-search-field__input::placeholder {
  color: var(--ne-ej-fg-secondary) !important;
}

.notepad-editorjs-holder .cdx-search-field svg {
  color: var(--ne-ej-fg-secondary);
}

/* List plugin settings fields (hardcoded light grays in the package). */
.notepad-editorjs-holder .cdx-list-start-with-field {
  background: var(--ne-ej-item-hover) !important;
  border: 1px solid var(--ne-ej-border) !important;
  color: var(--ne-ej-fg) !important;
}

.notepad-editorjs-holder .cdx-list-start-with-field__input {
  color: var(--ne-ej-fg) !important;
  background: transparent !important;
}

.notepad-editorjs-holder .cdx-list-start-with-field__input::placeholder {
  color: var(--ne-ej-fg-secondary) !important;
}

/* Inline toolbar separators / inputs */
.notepad-editorjs-holder .ce-inline-toolbar__toggler-and-button-wrapper,
.notepad-editorjs-holder .ce-inline-tool-input {
  border-color: var(--ne-ej-border) !important;
  background: var(--ne-ej-bg) !important;
  color: var(--ne-ej-fg) !important;
}

.notepad-editorjs-holder .ce-inline-tool-input::placeholder {
  color: var(--ne-ej-fg-secondary);
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
