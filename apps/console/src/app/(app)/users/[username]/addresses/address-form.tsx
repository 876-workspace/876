'use client'

import { Button } from '@876/ui/button'

import type { AddressFormProps } from '@/types/user-addresses'
import {
  AddressTypeSelect,
  DefaultCheckbox,
  FieldInput,
} from './address-fields'

export function AddressForm(props: AddressFormProps) {
  if (props.mode === 'edit') {
    const { draft, isPending, error, onDraftChange, onCancel, onSubmit } = props

    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(10rem,12rem)_minmax(10rem,14rem)_1fr_1fr_auto] lg:items-end">
            <AddressTypeSelect
              id="address-type"
              label="Type"
              value={draft.type}
              onChange={(type) => onDraftChange('type', type)}
            />
            <FieldInput
              id="address-label"
              label="Label"
              value={draft.label}
              placeholder="Optional"
              onChange={(label) => onDraftChange('label', label)}
            />
            <FieldInput
              id="address-line1"
              label="Line 1"
              value={draft.line1}
              placeholder="Street address"
              onChange={(line1) => onDraftChange('line1', line1)}
            />
            <FieldInput
              id="address-line2"
              label="Line 2"
              value={draft.line2}
              placeholder="Optional"
              onChange={(line2) => onDraftChange('line2', line2)}
            />
            <DefaultCheckbox
              id="address-default"
              checked={draft.is_default}
              onChange={(isDefault) => onDraftChange('is_default', isDefault)}
            />
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(12rem,1fr)_minmax(8rem,12rem)_minmax(8rem,12rem)] lg:items-end">
            <FieldInput
              id="address-city"
              label="City"
              value={draft.city}
              onChange={(city) => onDraftChange('city', city)}
            />
            <FieldInput
              id="address-country-code"
              label="Country code"
              value={draft.country_code}
              placeholder="US"
              onChange={(countryCode) =>
                onDraftChange('country_code', countryCode)
              }
            />
            <FieldInput
              id="address-postal-code"
              label="Postal code"
              value={draft.postal_code}
              onChange={(postalCode) =>
                onDraftChange('postal_code', postalCode)
              }
            />
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="info" onClick={onSubmit} disabled={isPending}>
            Save changes
          </Button>
        </div>
      </div>
    )
  }

  const { draft, isPending, error, onDraftChange, onCancel, onSubmit } = props

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(10rem,12rem)_minmax(10rem,14rem)_1fr_1fr_auto] lg:items-end">
          <AddressTypeSelect
            id="address-type"
            label="Type"
            value={draft.type}
            onChange={(type) => onDraftChange('type', type)}
          />
          <FieldInput
            id="address-label"
            label="Label"
            value={draft.label}
            placeholder="Optional"
            onChange={(label) => onDraftChange('label', label)}
          />
          <FieldInput
            id="address-line1"
            label="Line 1"
            value={draft.line1}
            placeholder="Street address"
            onChange={(line1) => onDraftChange('line1', line1)}
          />
          <FieldInput
            id="address-line2"
            label="Line 2"
            value={draft.line2}
            placeholder="Optional"
            onChange={(line2) => onDraftChange('line2', line2)}
          />
          <DefaultCheckbox
            id="address-default"
            checked={draft.isDefault}
            onChange={(isDefault) => onDraftChange('isDefault', isDefault)}
          />
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(12rem,1fr)_minmax(8rem,12rem)_minmax(8rem,12rem)] lg:items-end">
          <FieldInput
            id="address-city"
            label="City"
            value={draft.city}
            onChange={(city) => onDraftChange('city', city)}
          />
          <FieldInput
            id="address-country-code"
            label="Country code"
            value={draft.countryCode}
            placeholder="US"
            onChange={(countryCode) =>
              onDraftChange('countryCode', countryCode)
            }
          />
          <FieldInput
            id="address-postal-code"
            label="Postal code"
            value={draft.postalCode}
            onChange={(postalCode) => onDraftChange('postalCode', postalCode)}
          />
        </div>
        {error && <p className="text-destructive text-sm">{error}</p>}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button variant="info" onClick={onSubmit} disabled={isPending}>
          Add address
        </Button>
      </div>
    </div>
  )
}
