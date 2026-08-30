'use client'

import { cn } from '@876/core/utils'
import { RadioGroup, RadioGroupItem } from '@876/ui/radio-group'

export const CATEGORY_COLORS = [
  'blue',
  'emerald',
  'violet',
  'amber',
  'rose',
  'cyan',
  'slate',
] as const

export type CategoryColor = (typeof CATEGORY_COLORS)[number]

export const CATEGORY_COLOR_VARIANTS: Record<
  string,
  {
    bg: string
    text: string
    border: string
    dot: string
  }
> = {
  blue: {
    bg: 'bg-blue-500/10 dark:bg-blue-500/20',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-500/30',
    dot: 'bg-blue-500',
  },
  emerald: {
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-500/30',
    dot: 'bg-emerald-500',
  },
  violet: {
    bg: 'bg-violet-500/10 dark:bg-violet-500/20',
    text: 'text-violet-600 dark:text-violet-400',
    border: 'border-violet-500/30',
    dot: 'bg-violet-500',
  },
  amber: {
    bg: 'bg-amber-500/10 dark:bg-amber-500/20',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-500/30',
    dot: 'bg-amber-500',
  },
  rose: {
    bg: 'bg-rose-500/10 dark:bg-rose-500/20',
    text: 'text-rose-600 dark:text-rose-400',
    border: 'border-rose-500/30',
    dot: 'bg-rose-500',
  },
  cyan: {
    bg: 'bg-cyan-500/10 dark:bg-cyan-500/20',
    text: 'text-cyan-600 dark:text-cyan-400',
    border: 'border-cyan-500/30',
    dot: 'bg-cyan-500',
  },
  slate: {
    bg: 'bg-slate-500/10 dark:bg-slate-500/20',
    text: 'text-slate-600 dark:text-slate-400',
    border: 'border-slate-500/30',
    dot: 'bg-slate-500',
  },
}

export function getCategoryColorVariant(color?: string | null) {
  if (color && color in CATEGORY_COLOR_VARIANTS) {
    return CATEGORY_COLOR_VARIANTS[color]
  }
  return CATEGORY_COLOR_VARIANTS.blue
}

export function CategoryColorPicker({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (color: string) => void
  disabled?: boolean
}) {
  return (
    <RadioGroup
      value={value}
      onValueChange={(next) => next && onChange(next)}
      disabled={disabled}
      className="flex flex-row flex-wrap items-center gap-2"
      aria-label="Colour"
    >
      {CATEGORY_COLORS.map((color) => {
        const isSelected = value === color
        const config =
          CATEGORY_COLOR_VARIANTS[color] ?? CATEGORY_COLOR_VARIANTS.blue
        return (
          <label
            key={color}
            title={color}
            aria-label={color}
            className="flex aspect-square size-7 shrink-0 cursor-pointer items-center justify-center rounded-full select-none"
          >
            <RadioGroupItem value={color} className="sr-only" />
            <span
              className={cn(
                'ring-offset-background aspect-square size-5 shrink-0 rounded-full ring-offset-2 transition-all',
                config.dot,
                isSelected
                  ? 'ring-foreground/50 ring-2'
                  : 'opacity-70 hover:opacity-100'
              )}
            />
          </label>
        )
      })}
    </RadioGroup>
  )
}
