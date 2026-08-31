'use client'

import { FormRow } from '@876/ui/form-row'
import { Input } from '@876/ui/input'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'

import {
  rowReferenceKey,
  type FinanceResourceDefinition,
  type FinanceResourceRow,
} from '../finance-provisioning-utils'

type Props = {
  definition: FinanceResourceDefinition
  row: FinanceResourceRow
  allRows: FinanceResourceRow[]
  onChange: (row: FinanceResourceRow) => void
}

export function FinanceSingletonEditor({
  definition,
  row,
  allRows,
  onChange,
}: Props) {
  return (
    <div className="max-w-2xl space-y-4">
      {definition.fields.map((field) => {
        const inputId = `singleton-${definition.resource_type}-${field.key}`
        const value = row.values[field.key]
        const referenceRows = field.reference_namespace
          ? allRows.filter(
              (candidate) =>
                candidate.resourceType === field.reference_namespace
            )
          : []
        const options = field.allowed_values
          ? field.allowed_values
          : field.value_type === 'reference' && referenceRows.length > 0
            ? referenceRows.map(rowReferenceKey).filter(Boolean)
            : null

        return (
          <FormRow
            key={field.key}
            htmlFor={inputId}
            label={field.label}
            required={field.required}
          >
            {field.value_type === 'boolean' ? (
              <NativeSelect
                id={inputId}
                className="w-full max-w-md"
                value={String(value ?? false)}
                onChange={(event) =>
                  onChange({
                    ...row,
                    values: {
                      ...row.values,
                      [field.key]: event.target.value === 'true',
                    },
                  })
                }
              >
                <NativeSelectOption value="true">Yes</NativeSelectOption>
                <NativeSelectOption value="false">No</NativeSelectOption>
              </NativeSelect>
            ) : options ? (
              <NativeSelect
                id={inputId}
                className="w-full max-w-md"
                value={String(value ?? '')}
                onChange={(event) =>
                  onChange({
                    ...row,
                    values: {
                      ...row.values,
                      [field.key]: event.target.value,
                    },
                  })
                }
              >
                {!field.required && (
                  <NativeSelectOption value="">None</NativeSelectOption>
                )}
                {options.map((option) => (
                  <NativeSelectOption key={option} value={option}>
                    {option}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            ) : (
              <Input
                id={inputId}
                className="max-w-md"
                type={
                  field.value_type === 'integer' ||
                  field.value_type === 'decimal'
                    ? 'number'
                    : 'text'
                }
                step={field.value_type === 'decimal' ? 'any' : undefined}
                value={String(value ?? '')}
                onChange={(event) =>
                  onChange({
                    ...row,
                    values: {
                      ...row.values,
                      [field.key]: event.target.value,
                    },
                  })
                }
              />
            )}
          </FormRow>
        )
      })}
    </div>
  )
}
