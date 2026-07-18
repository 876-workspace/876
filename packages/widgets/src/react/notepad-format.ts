import type { CSSProperties } from 'react'
import { getNotePlainText, isNoteBodyEmpty } from './notepad-editor-data'

const noteDateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
})
const noteTimeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
})

export const NOTE_COLORS = [
  'yellow',
  'pink',
  'blue',
  'green',
  'purple',
  'gray',
] as const

export type NoteColor = (typeof NOTE_COLORS)[number]

export const DEFAULT_NOTE_COLOR: NoteColor = 'yellow'

/**
 * Explicit palette (not Tailwind utilities). Host apps only @source their own
 * `src/`, so classes like `bg-amber-300` in this package never ship in CSS.
 *
 * Dark tokens are hand-tuned oklch “dusk paper” surfaces — slightly above the
 * 876 slate ladder so notes lift off the canvas, with soft chroma and light
 * warm/cool ink for readable contrast.
 */
export const NOTE_COLOR_PALETTE: Record<
  NoteColor,
  {
    label: string
    swatch: string
    swatchBorder: string
    surface: string
    surfaceHover: string
    border: string
    ink: string
    surfaceDark: string
    surfaceHoverDark: string
    borderDark: string
    inkDark: string
  }
> = {
  yellow: {
    label: 'Yellow',
    swatch: '#fcd34d',
    swatchBorder: '#f59e0b',
    surface: '#fffbeb',
    surfaceHover: '#fef3c7',
    border: 'rgba(245, 158, 11, 0.45)',
    ink: '#451a03',
    // Warm amber dusk
    surfaceDark: 'oklch(0.29 0.045 88)',
    surfaceHoverDark: 'oklch(0.325 0.055 88)',
    borderDark: 'oklch(0.62 0.11 80 / 0.42)',
    inkDark: 'oklch(0.94 0.025 95)',
  },
  pink: {
    label: 'Pink',
    swatch: '#f9a8d4',
    swatchBorder: '#ec4899',
    surface: '#fdf2f8',
    surfaceHover: '#fce7f3',
    border: 'rgba(236, 72, 153, 0.4)',
    ink: '#500724',
    // Soft rose dusk
    surfaceDark: 'oklch(0.29 0.05 350)',
    surfaceHoverDark: 'oklch(0.325 0.06 350)',
    borderDark: 'oklch(0.62 0.12 350 / 0.4)',
    inkDark: 'oklch(0.94 0.02 350)',
  },
  blue: {
    label: 'Blue',
    swatch: '#7dd3fc',
    swatchBorder: '#0ea5e9',
    surface: '#f0f9ff',
    surfaceHover: '#e0f2fe',
    border: 'rgba(14, 165, 233, 0.4)',
    ink: '#082f49',
    // Cool sky dusk
    surfaceDark: 'oklch(0.29 0.045 230)',
    surfaceHoverDark: 'oklch(0.325 0.055 230)',
    borderDark: 'oklch(0.62 0.1 230 / 0.4)',
    inkDark: 'oklch(0.94 0.02 230)',
  },
  green: {
    label: 'Green',
    swatch: '#6ee7b7',
    swatchBorder: '#10b981',
    surface: '#ecfdf5',
    surfaceHover: '#d1fae5',
    border: 'rgba(16, 185, 129, 0.4)',
    ink: '#022c22',
    // Soft mint/forest dusk
    surfaceDark: 'oklch(0.29 0.045 160)',
    surfaceHoverDark: 'oklch(0.325 0.055 160)',
    borderDark: 'oklch(0.62 0.1 155 / 0.4)',
    inkDark: 'oklch(0.94 0.02 155)',
  },
  purple: {
    label: 'Purple',
    swatch: '#c4b5fd',
    swatchBorder: '#8b5cf6',
    surface: '#f5f3ff',
    surfaceHover: '#ede9fe',
    border: 'rgba(139, 92, 246, 0.4)',
    ink: '#2e1065',
    // Soft violet dusk
    surfaceDark: 'oklch(0.29 0.05 295)',
    surfaceHoverDark: 'oklch(0.325 0.06 295)',
    borderDark: 'oklch(0.62 0.12 295 / 0.4)',
    inkDark: 'oklch(0.94 0.02 295)',
  },
  gray: {
    label: 'Gray',
    swatch: '#d4d4d8',
    swatchBorder: '#a1a1aa',
    surface: '#fafafa',
    surfaceHover: '#f4f4f5',
    border: 'rgba(113, 113, 122, 0.35)',
    ink: '#18181b',
    // Elevated slate (matches 876 dark ladder)
    surfaceDark: 'oklch(0.29 0.012 255)',
    surfaceHoverDark: 'oklch(0.325 0.014 255)',
    borderDark: 'oklch(0.7 0.015 255 / 0.28)',
    inkDark: 'oklch(0.94 0.005 255)',
  },
}

export function resolveNoteColor(color: string | null | undefined): NoteColor {
  if (color && (NOTE_COLORS as readonly string[]).includes(color))
    return color as NoteColor
  return DEFAULT_NOTE_COLOR
}

export function getNoteColorPalette(color: string | null | undefined) {
  return NOTE_COLOR_PALETTE[resolveNoteColor(color)]
}

/** CSS variables for sticky surfaces (light + dark; dark applied via CSS). */
export function noteColorCssVars(
  color: string | null | undefined
): CSSProperties {
  const palette = getNoteColorPalette(color)
  return {
    ['--sticky-swatch' as string]: palette.swatch,
    ['--sticky-swatch-border' as string]: palette.swatchBorder,
    ['--sticky-surface' as string]: palette.surface,
    ['--sticky-surface-hover' as string]: palette.surfaceHover,
    ['--sticky-border' as string]: palette.border,
    ['--sticky-ink' as string]: palette.ink,
    ['--sticky-surface-dark' as string]: palette.surfaceDark,
    ['--sticky-surface-hover-dark' as string]: palette.surfaceHoverDark,
    ['--sticky-border-dark' as string]: palette.borderDark,
    ['--sticky-ink-dark' as string]: palette.inkDark,
  }
}

/** Shared sticky color rules used by cards, swatches, and the editor shell. */
export const NOTE_STICKY_COLOR_CSS = `
.note-sticky-swatch {
  background-color: var(--sticky-swatch);
  border-color: var(--sticky-swatch-border);
}

.note-sticky-card {
  background-color: var(--sticky-surface);
  border-color: var(--sticky-border);
  color: var(--sticky-ink);
}

.note-sticky-card:hover {
  background-color: var(--sticky-surface-hover);
}

/* Open-note body only (not header / footer / color bar). */
.note-sticky-editor {
  background-color: var(--sticky-surface);
  color: var(--sticky-ink);
}

.note-sticky-editor input,
.note-sticky-editor .notepad-editorjs-holder {
  color: inherit;
}

.note-sticky-editor input::placeholder {
  color: color-mix(in oklab, var(--sticky-ink) 45%, transparent);
}

/* New-note CTA — soft neutral with a warm sticky accent (not solid neon amber). */
.note-new-button {
  background-color: color-mix(in oklab, var(--background, #fff) 88%, #fcd34d) !important;
  color: var(--foreground, #171717) !important;
  border-color: color-mix(in oklab, #f59e0b 28%, var(--border, #e5e5e5)) !important;
  border-width: 1px !important;
  border-style: solid !important;
  box-shadow: 0 1px 2px oklch(0.45 0.04 75 / 0.08);
}
.note-new-button:hover:not(:disabled) {
  background-color: color-mix(in oklab, var(--background, #fff) 72%, #fde68a) !important;
  color: var(--foreground, #171717) !important;
  border-color: color-mix(in oklab, #f59e0b 40%, var(--border, #e5e5e5)) !important;
}
.note-new-button:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 2px var(--background, #fff),
    0 0 0 4px color-mix(in oklab, #0ea5e9 45%, transparent);
}
.dark .note-new-button,
html.dark .note-new-button {
  background-color: color-mix(in oklab, var(--background, #0a0a0a) 82%, oklch(0.45 0.08 88)) !important;
  color: var(--foreground, #fafafa) !important;
  border-color: color-mix(in oklab, oklch(0.72 0.12 85) 32%, transparent) !important;
  box-shadow: 0 1px 2px oklch(0 0 0 / 0.28);
}
.dark .note-new-button:hover:not(:disabled),
html.dark .note-new-button:hover:not(:disabled) {
  background-color: color-mix(in oklab, var(--background, #0a0a0a) 70%, oklch(0.5 0.1 88)) !important;
}

/* Dark mode: dusk-paper surfaces with soft chroma + light ink. */
.dark .note-sticky-card,
html.dark .note-sticky-card {
  background-color: var(--sticky-surface-dark);
  border-color: var(--sticky-border-dark);
  color: var(--sticky-ink-dark);
  box-shadow: 0 1px 0 oklch(1 0 0 / 4%) inset;
}

.dark .note-sticky-card:hover,
html.dark .note-sticky-card:hover {
  background-color: var(--sticky-surface-hover-dark);
}

.dark .note-sticky-editor,
html.dark .note-sticky-editor {
  background-color: var(--sticky-surface-dark);
  color: var(--sticky-ink-dark);
}

.dark .note-sticky-editor input::placeholder,
html.dark .note-sticky-editor input::placeholder {
  color: color-mix(in oklab, var(--sticky-ink-dark) 42%, transparent);
}
`

function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  )
}

export function formatNoteUpdatedAt(timestamp: number) {
  const updatedAt = new Date(timestamp)
  return isSameDay(updatedAt, new Date())
    ? noteTimeFormatter.format(updatedAt)
    : noteDateFormatter.format(updatedAt)
}

export function getNotePreview(body: string) {
  const plain = getNotePlainText(body)
  return plain || 'Empty note'
}

export function getNoteWordCount(body: string) {
  const plain = getNotePlainText(body)
  return plain ? plain.split(/\s+/).length : 0
}

export function getNoteCharacterCount(body: string) {
  return getNotePlainText(body).length
}

export { isNoteBodyEmpty }

function noteUpdatedMs(entry: {
  updatedAt?: number
  updated_at?: number
}): number {
  if (typeof entry.updatedAt === 'number') return entry.updatedAt
  if (typeof entry.updated_at === 'number')
    // API stores Unix seconds; UI timestamps are ms for Date formatting.
    return entry.updated_at < 1e12 ? entry.updated_at * 1000 : entry.updated_at
  return 0
}

/** Sticky Notes list order: pinned first, then most recently modified. */
export function sortStickyNotes<
  T extends {
    pinned?: boolean | null
    updatedAt?: number
    updated_at?: number
  },
>(entries: readonly T[]): T[] {
  // Avoid Array.prototype.toSorted so the dock works in older browsers.
  return [...entries].sort((left, right) => {
    const pinDelta = Number(!!right.pinned) - Number(!!left.pinned)
    if (pinDelta !== 0) return pinDelta
    return noteUpdatedMs(right) - noteUpdatedMs(left)
  })
}
