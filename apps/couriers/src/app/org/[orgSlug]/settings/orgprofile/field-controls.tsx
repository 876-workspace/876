'use client'

import type { ReactNode } from 'react'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@876/ui/select'

import type { ProfileFormValues } from './profile-form'
import type { FieldKey, FieldSpec, SectionSpec } from './field-spec'

/** Everything the section layout needs to render the form. */
export type SectionsProps = {
  sections: SectionSpec[]
  values: ProfileFormValues
  disabled: boolean
  onChange: (key: FieldKey, value: string) => void
  /** The logo uploader, pre-wired by the form so the layout stays presentational. */
  logo: ReactNode
}

type ControlProps = {
  field: FieldSpec
  value: string
  disabled: boolean
  onChange: (key: FieldKey, value: string) => void
}

/** Renders a spec as an input or a select, whichever the spec calls for. */
export function FieldControl({
  field,
  value,
  disabled,
  onChange,
}: ControlProps) {
  const selectOptions = field.options ?? []

  if (field.options)
    return (
      <Select
        value={value}
        onValueChange={(next) => onChange(field.key, next || '')}
        disabled={disabled || field.options.length === 0}
        items={selectOptions}
      >
        <SelectTrigger id={field.key} className="w-full">
          <SelectValue placeholder={field.placeholder ?? 'Select'} />
        </SelectTrigger>
        <SelectContent>
          {selectOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )

  return (
    <Input
      id={field.key}
      name={field.key}
      type={field.type ?? 'text'}
      value={value}
      disabled={disabled}
      placeholder={field.placeholder}
      required={field.required}
      maxLength={field.maxLength}
      className="w-full"
      onChange={(event) =>
        onChange(
          field.key,
          field.uppercase
            ? event.target.value.toUpperCase()
            : event.target.value
        )
      }
    />
  )
}

/** Label text plus the required marker; shared by every row style. */
export function FieldLabel({
  field,
  className,
}: {
  field: Pick<FieldSpec, 'key' | 'label' | 'required'>
  className?: string
}) {
  return (
    <Label htmlFor={field.key} className={className}>
      {field.label}
      {field.required ? <span aria-hidden="true"> *</span> : null}
    </Label>
  )
}

export function FieldHint({ children }: { children: string }) {
  return <p className="text-muted-foreground mt-1 text-xs">{children}</p>
}
