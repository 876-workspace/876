'use client'

import type { AdminJsonValue, AdminOnboardingField } from '@876/admin'
import { Button } from '@876/ui/button'
import { Checkbox } from '@876/ui/checkbox'
import { Field, FieldDescription, FieldLabel } from '@876/ui/field'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'
import { Textarea } from '@876/ui/textarea'

type JsonObject = { [key: string]: AdminJsonValue }

function valueAsString(value: AdminJsonValue | undefined) {
  return typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : ''
}

function valueAsCollection(value: AdminJsonValue | undefined): JsonObject[] {
  if (!Array.isArray(value)) return []
  return value.filter(
    (item): item is JsonObject =>
      typeof item === 'object' && item !== null && !Array.isArray(item)
  )
}

function ScalarControl({
  field,
  id,
  value,
  onChange,
}: {
  field: AdminOnboardingField
  id: string
  value: AdminJsonValue | undefined
  onChange: (value: AdminJsonValue) => void
}) {
  if (field.field_type === 'boolean') {
    return (
      <div className="flex items-center gap-2 pt-1">
        <Checkbox
          id={id}
          checked={value === true}
          onCheckedChange={(checked) => onChange(checked === true)}
        />
        <Label htmlFor={id} className="font-normal">
          Yes
        </Label>
      </div>
    )
  }

  if (field.field_type === 'select') {
    return (
      <NativeSelect
        id={id}
        value={valueAsString(value)}
        onChange={(event) => onChange(event.target.value)}
        className="w-full"
      >
        <NativeSelectOption value="">Select an option</NativeSelectOption>
        {field.options.map((option) => (
          <NativeSelectOption key={option.value} value={option.value}>
            {option.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    )
  }

  if (field.field_type === 'multiselect') {
    const selected = Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string')
      : []
    return (
      <div className="grid gap-2 rounded-md border p-3 sm:grid-cols-2">
        {field.options.map((option) => (
          <label key={option.value} className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={selected.includes(option.value)}
              onCheckedChange={(checked) =>
                onChange(
                  checked === true
                    ? [...selected, option.value]
                    : selected.filter((item) => item !== option.value)
                )
              }
            />
            {option.label}
          </label>
        ))}
      </div>
    )
  }

  if (field.field_type === 'text') {
    return (
      <Textarea
        id={id}
        value={valueAsString(value)}
        onChange={(event) => onChange(event.target.value)}
        placeholder={field.placeholder ?? undefined}
      />
    )
  }

  return (
    <Input
      id={id}
      type={
        field.field_type === 'integer'
          ? 'number'
          : field.field_type === 'email'
            ? 'email'
            : field.field_type === 'url'
              ? 'url'
              : field.field_type === 'date'
                ? 'date'
                : 'text'
      }
      value={valueAsString(value)}
      onChange={(event) =>
        onChange(
          field.field_type === 'integer'
            ? event.target.value === ''
              ? ''
              : Number(event.target.value)
            : event.target.value
        )
      }
      placeholder={field.placeholder ?? undefined}
      autoComplete={field.sensitive ? 'off' : undefined}
    />
  )
}

function CollectionControl({
  field,
  id,
  value,
  onChange,
}: {
  field: AdminOnboardingField
  id: string
  value: AdminJsonValue | undefined
  onChange: (value: AdminJsonValue) => void
}) {
  const items = valueAsCollection(value)

  function updateItem(index: number, key: string, itemValue: AdminJsonValue) {
    onChange(
      items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: itemValue } : item
      )
    )
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={`${id}-${index}`} className="rounded-lg border p-4">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-medium">
              {field.label} {index + 1}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange(items.filter((_, i) => i !== index))}
            >
              Remove
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {field.item_fields.map((itemField) => {
              const itemId = `${id}-${index}-${itemField.key}`
              return (
                <Field key={itemField.key} className="gap-2">
                  <FieldLabel htmlFor={itemId}>
                    {itemField.label}
                    {itemField.required && (
                      <span className="text-destructive ml-1">*</span>
                    )}
                    {itemField.sensitive && (
                      <span className="text-muted-foreground ml-2 text-[10px] font-normal uppercase">
                        sensitive
                      </span>
                    )}
                  </FieldLabel>
                  {itemField.description && (
                    <FieldDescription className="text-xs">
                      {itemField.description}
                    </FieldDescription>
                  )}
                  <ScalarControl
                    field={itemField}
                    id={itemId}
                    value={item[itemField.key]}
                    onChange={(itemValue) =>
                      updateItem(index, itemField.key, itemValue)
                    }
                  />
                </Field>
              )
            })}
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        onClick={() => onChange([...items, {}])}
      >
        Add {field.label.toLowerCase().replace(/s$/, '')}
      </Button>
    </div>
  )
}

export function OnboardingField({
  field,
  value,
  onChange,
}: {
  field: AdminOnboardingField
  value: AdminJsonValue | undefined
  onChange: (value: AdminJsonValue) => void
}) {
  const id = `onboarding-${field.key}`
  return (
    <Field className="gap-2">
      <FieldLabel htmlFor={id}>
        {field.label}
        {field.required && <span className="text-destructive ml-1">*</span>}
        {field.sensitive && (
          <span className="text-muted-foreground ml-2 text-[10px] font-normal uppercase">
            sensitive
          </span>
        )}
      </FieldLabel>
      {field.description && (
        <FieldDescription className="text-xs">
          {field.description}
        </FieldDescription>
      )}
      {field.field_type === 'collection' ? (
        <CollectionControl
          field={field}
          id={id}
          value={value}
          onChange={onChange}
        />
      ) : (
        <ScalarControl
          field={field}
          id={id}
          value={value}
          onChange={onChange}
        />
      )}
    </Field>
  )
}
