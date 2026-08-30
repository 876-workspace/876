/**
 * Priorities are labels, so their colour is picked from a fixed palette rather
 * than typed in as a hex value. The key is what is persisted in
 * `RequestPriority.color`; anything unrecognised (including legacy hex values)
 * falls back to `slate` so a stale row still renders as a readable tag.
 */
export type PriorityColorVariant = {
  /** Human label shown in the picker. */
  label: string
  /** Solid swatch, for the picker and any dot affordance. */
  dot: string
  /** Text/icon colour used by `PriorityTag`. */
  text: string
}

export const PRIORITY_COLOR_VARIANTS = {
  red: {
    label: 'Red',
    dot: 'bg-red-500',
    text: 'text-red-600 dark:text-red-400',
  },
  orange: {
    label: 'Orange',
    dot: 'bg-orange-600',
    text: 'text-orange-600 dark:text-orange-400',
  },
  amber: {
    label: 'Amber',
    dot: 'bg-amber-500',
    text: 'text-amber-600 dark:text-amber-400',
  },
  green: {
    label: 'Green',
    dot: 'bg-green-600',
    text: 'text-green-600 dark:text-green-400',
  },
  blue: {
    label: 'Blue',
    dot: 'bg-blue-500',
    text: 'text-blue-600 dark:text-blue-400',
  },
  violet: {
    label: 'Violet',
    dot: 'bg-violet-500',
    text: 'text-violet-600 dark:text-violet-400',
  },
  pink: {
    label: 'Pink',
    dot: 'bg-pink-500',
    text: 'text-pink-600 dark:text-pink-400',
  },
  slate: {
    label: 'Slate',
    dot: 'bg-slate-500',
    text: 'text-slate-600 dark:text-slate-400',
  },
} as const satisfies Record<string, PriorityColorVariant>

export type PriorityColor = keyof typeof PRIORITY_COLOR_VARIANTS

export const PRIORITY_COLORS = Object.keys(
  PRIORITY_COLOR_VARIANTS
) as PriorityColor[]

export const DEFAULT_PRIORITY_COLOR: PriorityColor = 'blue'

export function isPriorityColor(
  value: string | null | undefined
): value is PriorityColor {
  return value != null && value in PRIORITY_COLOR_VARIANTS
}

/** Resolves a stored colour value, falling back for legacy/unknown values. */
export function priorityColorVariant(
  color: string | null | undefined
): PriorityColorVariant {
  return isPriorityColor(color)
    ? PRIORITY_COLOR_VARIANTS[color]
    : PRIORITY_COLOR_VARIANTS.slate
}

/** The picker's value for a stored colour; unknown values start on the default. */
export function toPriorityColor(color: string | null | undefined) {
  return isPriorityColor(color) ? color : DEFAULT_PRIORITY_COLOR
}
