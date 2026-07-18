'use client'

import { Checkbox } from '@876/ui/checkbox'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@876/ui/select'

import {
  ADDRESS_TYPES,
  formatAddressType,
  isAddressType,
} from './address-utils'
import type { AddressType } from '@/types/user-addresses'

export function AddressTypeSelect({
  id,
  label,
  value,
  onChange,
}: {
  id?: string
  label: string
  value: AddressType
  onChange: (value: AddressType) => void
}) {
  const inputId = id ?? label.toLowerCase().replaceAll(' ', '-')

  return (
    <div className="space-y-1.5">
      <Label htmlFor={inputId}>{label}</Label>
      <Select
        value={value}
        onValueChange={(nextValue) => {
          if (isAddressType(nextValue)) onChange(nextValue)
        }}
      >
        <SelectTrigger id={inputId} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ADDRESS_TYPES.map((type) => (
            <SelectItem key={type} value={type}>
              {formatAddressType(type)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export function FieldInput({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id?: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  const inputId = id ?? label.toLowerCase().replaceAll(' ', '-')

  return (
    <div className="space-y-1.5">
      <Label htmlFor={inputId}>{label}</Label>
      <Input
        id={inputId}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  )
}

export function DefaultCheckbox({
  id,
  checked,
  onChange,
}: {
  id: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <div className="flex items-center gap-3 pb-2">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(nextChecked) => onChange(nextChecked === true)}
      />
      <Label htmlFor={id}>Default</Label>
    </div>
  )
}
