export const EDITORJS_THEME_CSS = `
.editorjs {
  color: var(--foreground, inherit);
  --editor-elevated: var(--popover, #ffffff);
  --editor-elevated-fg: var(--popover-foreground, #18181b);
  --editor-muted: var(--muted, #f4f4f5);
  --editor-muted-fg: var(--muted-foreground, #71717a);
  --editor-border: var(--border, rgba(24, 24, 27, 0.12));
  --editor-border-strong: color-mix(in oklab, var(--editor-border) 70%, currentColor 30%);
  --editor-ring: var(--ring, #3b82f6);
  --editor-accent: var(--primary, #2563eb);
  --editor-fg: var(--foreground, #18181b);
  --editor-shadow: 0 10px 28px rgba(15, 23, 42, 0.14);
}

.dark .editorjs,
html.dark .editorjs {
  --editor-elevated: var(--popover, oklch(0.27 0.02 262));
  --editor-elevated-fg: var(--popover-foreground, oklch(0.96 0.01 262));
  --editor-muted: var(--muted, oklch(0.32 0.02 262));
  --editor-muted-fg: var(--muted-foreground, oklch(0.72 0.02 262));
  --editor-border: var(--border, oklch(1 0 0 / 0.12));
  --editor-fg: var(--foreground, oklch(0.96 0.01 262));
  --editor-shadow: 0 14px 36px rgba(0, 0, 0, 0.55);
}

.editorjs-holder {
  color: var(--editor-fg);
  position: relative;
  z-index: 0;
}

.editorjs-holder .codex-editor,
.editorjs-holder .codex-editor__redactor {
  color: inherit;
}

.editorjs-holder .codex-editor__redactor {
  padding-bottom: 1rem !important;
}

.editorjs-holder .ce-block__content,
.editorjs-holder .ce-toolbar__content {
  max-width: 100%;
  margin-left: 0;
  margin-right: 0;
}

.editorjs-holder .ce-paragraph,
.editorjs-holder .ce-header,
.editorjs-holder .cdx-block,
.editorjs-holder .cdx-list,
.editorjs-holder .cdx-checklist__text {
  color: inherit;
}

.editorjs-holder .ce-paragraph[data-placeholder]:empty::before,
.editorjs-holder .ce-header[data-placeholder]:empty::before {
  color: var(--editor-muted-fg);
  opacity: 0.85;
}

.editorjs-holder .ce-block--selected .ce-block__content {
  background: color-mix(in oklab, var(--editor-accent) 14%, transparent);
}

.editorjs-holder .ce-toolbar,
.editorjs-holder .codex-editor__toolbar {
  z-index: 30;
}

.editorjs-holder .ce-toolbar__plus,
.editorjs-holder .ce-toolbar__settings-btn {
  color: var(--editor-muted-fg);
  background: color-mix(in oklab, var(--editor-elevated) 92%, transparent);
  border: 1px solid var(--editor-border);
}

.editorjs-holder .ce-toolbar__plus:hover,
.editorjs-holder .ce-toolbar__settings-btn:hover,
.editorjs-holder .ce-toolbar__plus--active,
.editorjs-holder .ce-toolbar__settings-btn--active {
  color: var(--editor-fg);
  background: var(--editor-muted);
  border-color: var(--editor-border-strong);
}

.editorjs-holder .ce-toolbar__actions {
  right: 0;
}

.editorjs-holder .ce-popover,
.editorjs-holder .ce-inline-toolbar,
.editorjs-holder .ce-conversion-toolbar,
.editorjs-holder .ce-settings,
.editorjs-holder .ce-toolbox {
  --color-background: var(--editor-elevated) !important;
  --color-text-primary: var(--editor-elevated-fg) !important;
  --color-text-secondary: var(--editor-muted-fg) !important;
  --color-border: var(--editor-border) !important;
  --color-border-icon: var(--editor-border) !important;
  --color-background-item-hover: var(--editor-muted) !important;
  --color-background-item-focus: color-mix(in oklab, var(--editor-accent) 12%, transparent) !important;
  --color-background-icon-active: color-mix(in oklab, var(--editor-accent) 14%, transparent) !important;
  --color-text-icon-active: var(--editor-accent) !important;
  color: var(--editor-elevated-fg) !important;
  z-index: 40;
}

.editorjs-holder .ce-popover__container,
.editorjs-holder .ce-inline-toolbar,
.editorjs-holder .ce-conversion-toolbar,
.editorjs-holder .ce-settings,
.editorjs-holder .ce-toolbox,
.editorjs-holder .ce-popover--nested .ce-popover__container {
  background: var(--editor-elevated) !important;
  color: var(--editor-elevated-fg) !important;
  border: 1px solid var(--editor-border) !important;
  box-shadow: var(--editor-shadow) !important;
  isolation: isolate;
}

.editorjs-holder .ce-popover-item,
.editorjs-holder .ce-inline-tool,
.editorjs-holder .ce-conversion-tool,
.editorjs-holder .ce-settings__button,
.editorjs-holder .cdx-settings-button {
  color: var(--editor-elevated-fg) !important;
  background: transparent !important;
}

.editorjs-holder .ce-popover-item:hover,
.editorjs-holder .ce-popover-item--focused,
.editorjs-holder .ce-popover-item--active,
.editorjs-holder .ce-inline-tool:hover,
.editorjs-holder .ce-inline-tool--active,
.editorjs-holder .ce-conversion-tool:hover,
.editorjs-holder .ce-settings__button:hover,
.editorjs-holder .cdx-settings-button:hover {
  background: var(--editor-muted) !important;
  color: var(--editor-elevated-fg) !important;
}

.editorjs-holder .ce-popover-item__icon,
.editorjs-holder .ce-popover-item__title,
.editorjs-holder .ce-popover-header__text,
.editorjs-holder .ce-popover-header__back-button {
  color: inherit !important;
}

.editorjs-holder .ce-popover-item__secondary-title,
.editorjs-holder .ce-popover__nothing-found-message {
  color: var(--editor-muted-fg) !important;
  opacity: 1 !important;
}

.editorjs-holder .ce-popover-item__icon {
  background: color-mix(in oklab, var(--editor-muted) 90%, transparent) !important;
  border-color: transparent !important;
  box-shadow: none !important;
}

.editorjs-holder .ce-popover-item__icon svg,
.editorjs-holder .ce-inline-tool svg,
.editorjs-holder .ce-conversion-tool svg,
.editorjs-holder .ce-settings__button svg,
.editorjs-holder .cdx-settings-button svg {
  color: currentColor !important;
  fill: none;
  stroke: currentColor;
}

.editorjs-holder .ce-popover-item-separator__line {
  background: var(--editor-border) !important;
}

.editorjs-holder .cdx-search-field,
.editorjs-holder .cdx-list-start-with-field {
  background: var(--editor-muted) !important;
  border: 1px solid var(--editor-border) !important;
  color: var(--editor-elevated-fg) !important;
}

.editorjs-holder .cdx-search-field__input,
.editorjs-holder .cdx-list-start-with-field__input,
.editorjs-holder .ce-inline-tool-input {
  color: inherit !important;
  background: transparent !important;
}

.editorjs-holder .cdx-search-field__input::placeholder,
.editorjs-holder .cdx-list-start-with-field__input::placeholder,
.editorjs-holder .ce-inline-tool-input::placeholder {
  color: var(--editor-muted-fg);
}

.editorjs-holder .cdx-checklist__item-checkbox,
.editorjs-holder .cdx-checklist__checkbox,
.editorjs-holder .cdx-checklist__item-checkbox-check {
  border-color: var(--editor-border-strong) !important;
}

.editorjs-holder .cdx-checklist__item--checked .cdx-checklist__item-checkbox,
.editorjs-holder .cdx-checklist__item--checked .cdx-checklist__checkbox {
  background: var(--editor-accent) !important;
  border-color: var(--editor-accent) !important;
}

.editorjs-holder .cdx-list__item,
.editorjs-holder .cdx-list-ordered,
.editorjs-holder .cdx-list-unordered {
  color: inherit;
}

.editorjs-holder .cdx-list__item::marker {
  color: var(--editor-muted-fg);
}

.editorjs-holder .cdx-block {
  padding: 0.15em 0;
}

.editorjs-holder a {
  color: var(--editor-accent);
  text-decoration: underline;
  text-underline-offset: 2px;
}
`
