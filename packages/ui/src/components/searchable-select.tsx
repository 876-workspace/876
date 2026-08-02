'use client'

import * as React from 'react'

import { cn } from '../lib/utils'
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
} from './combobox'

export type SearchableSelectOption = {
  value: string
  label: string
}

type Props = {
  /** Applied to the trigger so a `<Label htmlFor>` points at the control. */
  id?: string
  options: readonly SearchableSelectOption[]
  /** The selected option's `value`, or `''` when nothing is selected. */
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  disabled?: boolean
  className?: string
}

/**
 * A select whose options are filtered by a search field inside the popup.
 *
 * Native `<select>` and the plain `Select` primitive both stop being usable
 * somewhere around fifty options — a country list is well past that. The search
 * field lives inside the popup rather than beside the trigger so the trigger
 * still reads as a single form control.
 *
 * The trigger shows the selected option's `label`. Passing a bare list of codes
 * as options would render the code instead, which is how a country field ends
 * up displaying "BB" rather than "Barbados".
 */
export function SearchableSelect({
  id,
  options,
  value,
  onValueChange,
  placeholder = 'Select an option',
  searchPlaceholder = 'Search…',
  emptyMessage = 'No matches found.',
  disabled,
  className,
}: Props) {
  return (
    <Combobox
      items={options}
      value={value === '' ? null : value}
      onValueChange={(next) =>
        onValueChange(typeof next === 'string' ? next : '')
      }
      disabled={disabled}
    >
      <ComboboxTrigger
        id={id}
        data-placeholder={value === '' ? '' : undefined}
        className={cn(
          "border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-placeholder:text-muted-foreground dark:bg-input/30 dark:hover:bg-input/50 flex h-9 w-full items-center justify-between gap-1.5 rounded-md border bg-transparent py-2 pr-2 pl-2.5 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-3 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
          className
        )}
      >
        <ComboboxValue placeholder={placeholder} />
      </ComboboxTrigger>

      <ComboboxContent>
        <ComboboxInput placeholder={searchPlaceholder} showTrigger={false} />
        <ComboboxEmpty>{emptyMessage}</ComboboxEmpty>
        <ComboboxList>
          {(option: SearchableSelectOption) => (
            <ComboboxItem key={option.value} value={option.value}>
              {option.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
