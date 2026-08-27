'use client'

import { Button } from '@876/ui/button'
import {
  CATEGORY_ICON_KEYS,
  CategoryIcon,
  type CategoryIconKey,
} from '@876/ui/category-icons'
import { Popover, PopoverContent, PopoverTrigger } from '@876/ui/popover'

export function CategoryIconPicker({
  value,
  onChange,
  disabled,
}: {
  value: CategoryIconKey
  onChange: (value: CategoryIconKey) => void
  disabled?: boolean
}) {
  return (
    <Popover>
      <PopoverTrigger
        render={<Button type="button" variant="outline" size="icon" />}
        aria-label="Choose icon"
        disabled={disabled}
      >
        <CategoryIcon name={value} className="size-4" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-2">
        <div className="grid grid-cols-7 gap-1">
          {CATEGORY_ICON_KEYS.map((key) => (
            <Button
              key={key}
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Use ${key} icon`}
              aria-pressed={value === key}
              className={value === key ? 'ring-ring ring-2' : undefined}
              onClick={() => onChange(key)}
            >
              <CategoryIcon name={key} className="size-4" />
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
