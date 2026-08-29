'use client'

import { cn } from '@876/core/utils'
import { RadioGroup, RadioGroupItem } from '@876/ui/radio-group'

import { TEAM_COLOR_VARIANTS } from './team-row'

export const TEAM_COLORS = [
  'blue',
  'emerald',
  'violet',
  'amber',
  'rose',
  'cyan',
  'slate',
] as const

export function TeamColorPicker({
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
      {TEAM_COLORS.map((color) => {
        const isSelected = value === color
        const config = TEAM_COLOR_VARIANTS[color] ?? TEAM_COLOR_VARIANTS.blue
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
