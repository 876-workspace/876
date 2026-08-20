'use client'

import { useState } from 'react'
import { Button } from '@876/ui/button'
import { FormRow } from '@876/ui/form-row'
import { Input } from '@876/ui/input'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@876/ui/sheet'

import {
  rowReferenceKey,
  type FinanceResourceDefinition,
  type FinanceResourceRow,
} from '../finance-provisioning-utils'

type Props = {
  open: boolean
  definition: FinanceResourceDefinition
  row: FinanceResourceRow | null
  allRows: FinanceResourceRow[]
  isNew: boolean
  onSave: (row: FinanceResourceRow) => void
  onClose: () => void
}

export function FinanceResourceDrawer({
  open,
  definition,
  row,
  allRows,
  isNew,
  onSave,
  onClose,
}: Props) {
  if (!row) return null

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col justify-between overflow-y-auto p-6 sm:max-w-lg"
      >
        <ResourceDrawerForm
          key={row.localId}
          definition={definition}
          initialRow={row}
          allRows={allRows}
          isNew={isNew}
          onSave={onSave}
          onClose={onClose}
        />
      </SheetContent>
    </Sheet>
  )
}

function ResourceDrawerForm({
  definition,
  initialRow,
  allRows,
  isNew,
  onSave,
  onClose,
}: {
  definition: FinanceResourceDefinition
  initialRow: FinanceResourceRow
  allRows: FinanceResourceRow[]
  isNew: boolean
  onSave: (row: FinanceResourceRow) => void
  onClose: () => void
}) {
  const [draftRow, setDraftRow] = useState<FinanceResourceRow>(initialRow)
  const singularLabel = definition.label.replace(/ies$/, 'y').replace(/s$/, '')

  return (
    <>
      <div className="space-y-6">
        <SheetHeader className="p-0">
          <SheetTitle>
            {isNew ? 'Add' : 'Edit'} {singularLabel}
          </SheetTitle>
          <SheetDescription>{definition.description}</SheetDescription>
        </SheetHeader>

        <div className="space-y-4">
          {definition.fields.map((field) => {
            const inputId = `drawer-field-${field.key}`
            const value = draftRow.values[field.key]
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
                    className="w-full"
                    value={String(value ?? false)}
                    onChange={(event) =>
                      setDraftRow({
                        ...draftRow,
                        values: {
                          ...draftRow.values,
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
                    className="w-full"
                    value={String(value ?? '')}
                    onChange={(event) =>
                      setDraftRow({
                        ...draftRow,
                        values: {
                          ...draftRow.values,
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
                    type={
                      field.value_type === 'integer' ||
                      field.value_type === 'decimal'
                        ? 'number'
                        : 'text'
                    }
                    step={field.value_type === 'decimal' ? 'any' : undefined}
                    value={String(value ?? '')}
                    onChange={(event) =>
                      setDraftRow({
                        ...draftRow,
                        values: {
                          ...draftRow.values,
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
      </div>

      <SheetFooter className="mt-8 flex-row justify-end gap-2 border-t pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" onClick={() => onSave(draftRow)}>
          Save
        </Button>
      </SheetFooter>
    </>
  )
}
