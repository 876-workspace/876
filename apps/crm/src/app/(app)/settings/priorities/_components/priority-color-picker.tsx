'use client'

import { cn } from '@876/core/utils'
import { RadioGroup, RadioGroupItem } from '@876/ui/radio-group'

import {
  PRIORITY_COLORS,
  PRIORITY_COLOR_VARIANTS,
  type PriorityColor,
} from '@/features/priorities/priority-color'

export function PriorityColorPicker({
  value,
  onChange,
  disabled,
}: {
  value: PriorityColor
  onChange: (color: PriorityColor) => void
  disabled?: boolean
}) {
  return (
    <RadioGroup
      value={value}
      onValueChange={(next) => next && onChange(next as PriorityColor)}
      disabled={disabled}
      className="flex flex-row flex-wrap items-center gap-2"
      aria-label="Colour"
    >
      {PRIORITY_COLORS.map((color) => {
        const variant = PRIORITY_COLOR_VARIANTS[color]
        return (
          <label
            key={color}
            title={variant.label}
            aria-label={variant.label}
            className="flex aspect-square size-7 shrink-0 cursor-pointer items-center justify-center rounded-full select-none"
          >
            <RadioGroupItem value={color} className="sr-only" />
            <span
              className={cn(
                'ring-offset-background aspect-square size-5 shrink-0 rounded-full ring-offset-2 transition-all',
                variant.dot,
                value === color
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
