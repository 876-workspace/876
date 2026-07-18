'use client'

import { useId } from 'react'

import { Checkbox } from '../components/checkbox'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '../components/field'
import { Input } from '../components/input'
import { NativeSelect, NativeSelectOption } from '../components/native-select'
import { Textarea } from '../components/textarea'
import type {
  OnboardingAnswers,
  OnboardingFieldDefinition,
  OnboardingIssue,
  OnboardingSectionDefinition,
} from './types'

type CatalogFieldProps = {
  field: OnboardingFieldDefinition
  id: string
  value: unknown
  values: OnboardingAnswers
  onChange: (key: string, value: unknown) => void
  issues: OnboardingIssue[]
  disabled: boolean
}

const supportedFieldTypes = new Set([
  'string',
  'email',
  'phone',
  'url',
  'integer',
  'date',
  'text',
  'boolean',
  'select',
  'multiselect',
])

function valueAsString(value: unknown) {
  return typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : ''
}

function valueAsStrings(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

function MultiselectControl({
  field,
  id,
  value,
  onChange,
  disabled,
  hasIssues,
  isRequired,
}: Pick<
  CatalogFieldProps,
  'field' | 'id' | 'value' | 'onChange' | 'disabled'
> & {
  hasIssues: boolean
  isRequired: boolean
}) {
  const selected = valueAsStrings(value)

  return (
    <div
      role="group"
      aria-labelledby={`${id}-label`}
      aria-invalid={hasIssues || undefined}
      aria-required={isRequired || undefined}
      className="grid gap-3 sm:grid-cols-2"
    >
      {field.options.map((option, index) => {
        const checked = selected.includes(option.value)
        const optionId = `${id}-${index}`

        return (
          <label
            key={option.value}
            htmlFor={optionId}
            className="flex items-center gap-2 text-sm"
          >
            <Checkbox
              id={optionId}
              checked={checked}
              onCheckedChange={(nextChecked) =>
                onChange(
                  field.key,
                  nextChecked === true
                    ? checked
                      ? selected
                      : [...selected, option.value]
                    : selected.filter((item) => item !== option.value)
                )
              }
              disabled={disabled}
              aria-invalid={hasIssues || undefined}
            />
            {option.label}
          </label>
        )
      })}
    </div>
  )
}

function CatalogField({
  field,
  id,
  value,
  values,
  onChange,
  issues,
  disabled,
}: CatalogFieldProps) {
  if (!supportedFieldTypes.has(field.field_type)) return null

  const isRequired =
    field.required ||
    (field.required_when != null &&
      values[field.required_when.field_key] === field.required_when.equals)
  const hasIssues = issues.length > 0
  const label = (
    <>
      {field.label}
      {isRequired && (
        <span aria-hidden="true" className="text-muted-foreground">
          *
        </span>
      )}
    </>
  )

  if (field.field_type === 'boolean') {
    return (
      <Field data-disabled={disabled || undefined} data-invalid={hasIssues}>
        <div className="flex items-center gap-2">
          <Checkbox
            id={id}
            checked={value === true}
            onCheckedChange={(checked) => onChange(field.key, checked === true)}
            disabled={disabled}
            aria-invalid={hasIssues || undefined}
            aria-required={isRequired || undefined}
          />
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
        </div>
        {field.description && (
          <FieldDescription>{field.description}</FieldDescription>
        )}
        <FieldError errors={issues} />
      </Field>
    )
  }

  const labelId = `${id}-label`

  return (
    <Field data-disabled={disabled || undefined} data-invalid={hasIssues}>
      <FieldLabel
        id={field.field_type === 'multiselect' ? labelId : undefined}
        htmlFor={field.field_type === 'multiselect' ? undefined : id}
      >
        {label}
      </FieldLabel>
      {field.description && (
        <FieldDescription>{field.description}</FieldDescription>
      )}
      {field.field_type === 'select' ? (
        <NativeSelect
          id={id}
          value={valueAsString(value)}
          onChange={(event) => onChange(field.key, event.currentTarget.value)}
          disabled={disabled}
          aria-invalid={hasIssues || undefined}
          aria-required={isRequired || undefined}
          className="w-full"
        >
          <NativeSelectOption value="">
            {field.placeholder ?? 'Select an option'}
          </NativeSelectOption>
          {field.options.map((option) => (
            <NativeSelectOption key={option.value} value={option.value}>
              {option.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      ) : field.field_type === 'multiselect' ? (
        <MultiselectControl
          field={field}
          id={id}
          value={value}
          onChange={onChange}
          disabled={disabled}
          hasIssues={hasIssues}
          isRequired={isRequired}
        />
      ) : field.field_type === 'text' ? (
        <Textarea
          id={id}
          value={valueAsString(value)}
          onChange={(event) => onChange(field.key, event.currentTarget.value)}
          placeholder={field.placeholder ?? undefined}
          disabled={disabled}
          aria-invalid={hasIssues || undefined}
          aria-required={isRequired || undefined}
        />
      ) : (
        <Input
          id={id}
          type={
            field.field_type === 'integer'
              ? 'number'
              : field.field_type === 'email'
                ? 'email'
                : field.field_type === 'phone'
                  ? 'tel'
                  : field.field_type === 'url'
                    ? 'url'
                    : field.field_type === 'date'
                      ? 'date'
                      : 'text'
          }
          value={valueAsString(value)}
          onChange={(event) => {
            if (field.field_type !== 'integer') {
              onChange(field.key, event.currentTarget.value)
              return
            }

            const numberValue = event.currentTarget.valueAsNumber
            onChange(field.key, Number.isNaN(numberValue) ? null : numberValue)
          }}
          placeholder={field.placeholder ?? undefined}
          pattern={field.pattern ?? undefined}
          disabled={disabled}
          aria-invalid={hasIssues || undefined}
          aria-required={isRequired || undefined}
        />
      )}
      <FieldError errors={issues} />
    </Field>
  )
}

export function CatalogSectionForm({
  section,
  values,
  onChange,
  issues = [],
  disabled = false,
}: {
  section: OnboardingSectionDefinition
  values: OnboardingAnswers
  onChange: (key: string, value: unknown) => void
  issues?: OnboardingIssue[]
  disabled?: boolean
}) {
  const formId = useId()

  return (
    <FieldGroup>
      {section.fields.map((field) => (
        <CatalogField
          key={field.key}
          field={field}
          id={`${formId}-${field.key}`}
          value={values[field.key]}
          values={values}
          onChange={onChange}
          issues={issues.filter(
            (issue) =>
              issue.path === field.key || issue.path === `answers.${field.key}`
          )}
          disabled={disabled}
        />
      ))}
    </FieldGroup>
  )
}
