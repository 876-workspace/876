'use client'

import { FormRow } from '@876/ui/form-row'
import { Input } from '@876/ui/input'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'
import { Button } from '@876/ui/button'

import {
  financeFieldOptions,
  type FinanceResourceDefinition,
  type FinanceResourceRow,
  type FinanceSelectOption,
} from '../finance-provisioning-utils'

type Props = {
  definition: FinanceResourceDefinition
  row: FinanceResourceRow
  allRows: FinanceResourceRow[]
  languageOptions: readonly FinanceSelectOption[]
  onChange: (row: FinanceResourceRow) => void
  onSave: () => void
  isSaving?: boolean
}

export function FinanceSingletonEditor({
  definition,
  row,
  allRows,
  languageOptions,
  onChange,
  onSave,
  isSaving = false,
}: Props) {
  return (
    <div className="max-w-2xl space-y-4">
      {definition.fields.map((field) => {
        const inputId = `singleton-${definition.resource_type}-${field.key}`
        const value = row.values[field.key]
        const options = financeFieldOptions(field, allRows, languageOptions)

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
                <NativeSelectOption value="" disabled={field.required}>
                  {field.required
                    ? `Select ${field.label.toLowerCase()}`
                    : 'None'}
                </NativeSelectOption>
                {options.map((option) => (
                  <NativeSelectOption key={option.value} value={option.value}>
                    {option.label}
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
                    : field.key === 'effectiveFrom' ||
                        field.key === 'effectiveUntil'
                      ? 'date'
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
      <div className="pt-2">
        <Button type="button" size="sm" disabled={isSaving} onClick={onSave}>
          Save {definition.label.toLowerCase()}
        </Button>
      </div>
    </div>
  )
}
