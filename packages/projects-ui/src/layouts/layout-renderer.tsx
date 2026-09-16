'use client'

import { useState } from 'react'

import { Checkbox } from '@876/ui/checkbox'
import { FormRow } from '@876/ui/form-row'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { cn } from '@876/ui/lib/utils'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'
import { Textarea } from '@876/ui/textarea'

import { DEFAULT_FIELD_STATE, evaluateLayoutRules } from './evaluate-rules'
import type { FieldState, Layout, LayoutField, LayoutValues } from './types'

/** How the host renders one field; the layout decides whether and where it shows. */
type LayoutFieldControl = {
  kind:
    | 'text'
    | 'textarea'
    | 'number'
    | 'date'
    | 'select'
    | 'multi-select'
    | 'boolean'
  options?: { value: string; label: string }[]
}

type LayoutFieldDescriptor = {
  fieldKey: string
  label: string
  control: LayoutFieldControl
}

type LayoutRendererProps = {
  layout: Layout
  fields: LayoutFieldDescriptor[]
  /** Values the fields start with, keyed by layout field key. */
  values?: LayoutValues
  /** Prepended to every submitted name, so one form can host several renderers. */
  namePrefix?: string
}

function fieldId(namePrefix: string, fieldKey: string): string {
  return `${namePrefix}${fieldKey}`.replace(/[^a-zA-Z0-9_-]/g, '-')
}

function textValue(value: string | string[] | null | undefined): string {
  if (value === undefined || value === null) return ''

  return Array.isArray(value) ? value.join(', ') : value
}

function listValue(value: string | string[] | null | undefined): string[] {
  if (value === undefined || value === null) return []

  return Array.isArray(value) ? value : [value]
}

/**
 * Renders one layout as a plain form body: every control is a named native
 * input, so a surrounding `<form>` submits the values without callbacks.
 */
export function LayoutRenderer({
  layout,
  fields,
  values,
  namePrefix = '',
}: LayoutRendererProps) {
  const [currentValues, setCurrentValues] = useState<LayoutValues>(() => ({
    ...values,
  }))

  const states = evaluateLayoutRules(layout, currentValues)
  const descriptors = new Map(fields.map((field) => [field.fieldKey, field]))

  function setValue(fieldKey: string, value: string | string[] | null) {
    setCurrentValues((current) => ({ ...current, [fieldKey]: value }))
  }

  function renderControl(descriptor: LayoutFieldDescriptor, state: FieldState) {
    const id = fieldId(namePrefix, descriptor.fieldKey)
    const name = `${namePrefix}${descriptor.fieldKey}`
    const value = currentValues[descriptor.fieldKey]

    switch (descriptor.control.kind) {
      case 'textarea':
        return (
          <Textarea
            id={id}
            name={name}
            value={textValue(value)}
            required={state.required}
            disabled={state.disabled}
            onChange={(event) =>
              setValue(descriptor.fieldKey, event.target.value)
            }
          />
        )
      case 'number':
      case 'date':
      case 'text':
        return (
          <Input
            id={id}
            name={name}
            type={descriptor.control.kind}
            value={textValue(value)}
            required={state.required}
            disabled={state.disabled}
            onChange={(event) =>
              setValue(descriptor.fieldKey, event.target.value)
            }
          />
        )
      case 'select':
        return (
          <NativeSelect
            id={id}
            name={name}
            value={textValue(value)}
            required={state.required}
            disabled={state.disabled}
            onChange={(event) =>
              setValue(descriptor.fieldKey, event.target.value)
            }
          >
            <NativeSelectOption value="">Select…</NativeSelectOption>
            {(descriptor.control.options ?? []).map((option) => (
              <NativeSelectOption key={option.value} value={option.value}>
                {option.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        )
      case 'multi-select': {
        const selected = listValue(value)

        return (
          <div className="flex flex-col gap-2">
            {(descriptor.control.options ?? []).map((option) => {
              const optionId = `${id}-${option.value}`

              return (
                <div key={option.value} className="flex items-center gap-2">
                  <Checkbox
                    id={optionId}
                    name={name}
                    value={option.value}
                    checked={selected.includes(option.value)}
                    disabled={state.disabled}
                    onCheckedChange={(checked) =>
                      setValue(
                        descriptor.fieldKey,
                        checked
                          ? [...selected, option.value]
                          : selected.filter((entry) => entry !== option.value)
                      )
                    }
                  />
                  <Label htmlFor={optionId} className="mb-0">
                    {option.label}
                  </Label>
                </div>
              )
            })}
          </div>
        )
      }
      case 'boolean':
        return (
          <Checkbox
            id={id}
            name={name}
            value="true"
            uncheckedValue="false"
            checked={value === 'true'}
            required={state.required}
            disabled={state.disabled}
            onCheckedChange={(checked) =>
              setValue(descriptor.fieldKey, checked ? 'true' : 'false')
            }
          />
        )
    }
  }

  function renderField(field: LayoutField) {
    const descriptor = descriptors.get(field.fieldKey)
    if (!descriptor) return null

    const state = states[field.fieldKey] ?? DEFAULT_FIELD_STATE
    if (!state.visible) return null

    return (
      <FormRow
        key={field.fieldKey}
        htmlFor={
          descriptor.control.kind === 'multi-select'
            ? undefined
            : fieldId(namePrefix, field.fieldKey)
        }
        label={descriptor.label}
        required={state.required}
        className={cn(field.width === 2 && 'sm:col-span-2')}
      >
        {renderControl(descriptor, state)}
      </FormRow>
    )
  }

  return (
    <div data-slot="layout-renderer" className="flex flex-col gap-6">
      {layout.sections.map((section) => (
        <section
          key={section.key}
          data-slot="layout-section"
          className="flex flex-col gap-3"
        >
          <h3 className="text-sm font-medium">{section.title}</h3>
          <div
            data-columns={section.columns}
            className={cn(
              'grid gap-3',
              section.columns === 2 && 'sm:grid-cols-2'
            )}
          >
            {section.fields.map((field) => renderField(field))}
          </div>
        </section>
      ))}
    </div>
  )
}

export type { LayoutFieldControl, LayoutFieldDescriptor, LayoutRendererProps }
