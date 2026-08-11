'use client'

import * as React from 'react'

import { cn } from '../lib/utils'
import { Input } from './input'
import {
  SearchableSelect,
  type SearchableSelectOption,
} from './searchable-select'

export type PhoneInputValue = {
  /** ISO-2 country code for the selected calling code, e.g. `"JM"`. */
  countryCode: string
  /** The dialling code including its `+`, e.g. `"+1"`. */
  dialCode: string
  /** The national number as typed, without the dialling code. */
  number: string
}

type PhoneInputProps = {
  id?: string
  value: PhoneInputValue
  onValueChange: (value: PhoneInputValue) => void
  /**
   * The selectable dialling codes, already labelled for display. Give each one
   * a `leadingLabel` of the code itself so the popup reads as two columns.
   *
   * Passed in rather than imported so this package stays presentation-only —
   * the country catalog lives in `@876/core/phone` (`listDialCodes`).
   */
  dialCodes: readonly PhoneDialCodeOption[]
  placeholder?: string
  disabled?: boolean
  className?: string
}

export type PhoneDialCodeOption = SearchableSelectOption & {
  /** Dialling code submitted with the national number. */
  dialCode: string
}

/**
 * A phone field: a searchable dialling-code picker beside the number.
 *
 * The picker is searchable because the list runs to well over two hundred
 * entries — scrolling to find one is not a usable interaction at that size.
 */
function PhoneInput({
  id,
  value,
  onValueChange,
  dialCodes,
  placeholder = 'Phone number',
  disabled,
  className,
}: PhoneInputProps) {
  const selectedDialCode =
    dialCodes.find((option) => option.value === value.countryCode) ??
    dialCodes.find((option) => option.dialCode === value.dialCode)

  return (
    <div className={cn('flex items-start gap-2', className)}>
      <SearchableSelect
        options={dialCodes}
        value={selectedDialCode?.value ?? ''}
        onValueChange={(countryCode) => {
          const option = dialCodes.find((item) => item.value === countryCode)
          if (!option) return

          onValueChange({
            ...value,
            countryCode,
            dialCode: option.dialCode,
          })
        }}
        disabled={disabled}
        placeholder="Code"
        searchPlaceholder="Search"
        className="w-28 shrink-0"
      />
      <Input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        value={value.number}
        onChange={(event) =>
          onValueChange({ ...value, number: event.target.value })
        }
        placeholder={placeholder}
        disabled={disabled}
      />
    </div>
  )
}

export { PhoneInput }
