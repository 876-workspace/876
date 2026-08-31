'use client'

import { cn } from '@876/core/utils'
import { Badge } from '@876/ui/badge'
import { Button } from '@876/ui/button'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@876/ui/empty'
import { Input } from '@876/ui/input'
import { CheckIcon, Pencil, Plus, TableIcon, Trash, XIcon } from '@876/ui/icons'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'

import {
  fieldDisplayValue,
  financeFieldOptions,
  formatOptionLabel,
  type FinanceCurrencyOption,
  type FinanceFieldDefinition,
  type FinanceResourceDefinition,
  type FinanceResourceRow,
} from '../finance-provisioning-utils'

type Props = {
  definition: FinanceResourceDefinition
  rows: FinanceResourceRow[]
  allRows: FinanceResourceRow[]
  currencyOptions: readonly FinanceCurrencyOption[]
  editingRow: FinanceResourceRow | null
  isNewItem: boolean
  onAdd: () => void
  onEdit: (row: FinanceResourceRow) => void
  onEditChange: (row: FinanceResourceRow) => void
  onSave: (row: FinanceResourceRow) => void
  onDelete: (row: FinanceResourceRow) => void
  onCancel: () => void
  isSaving?: boolean
}

function InlineFieldControl({
  field,
  value,
  allRows,
  autoFocus,
  onChange,
}: {
  field: FinanceFieldDefinition
  value: string | boolean | undefined
  allRows: FinanceResourceRow[]
  autoFocus: boolean
  onChange: (value: string | boolean) => void
}) {
  const options = financeFieldOptions(field, allRows)
  const className = 'h-8 w-full min-w-28 bg-background text-[0.8125rem]'

  if (field.value_type === 'boolean') {
    return (
      <NativeSelect
        aria-label={field.label}
        autoFocus={autoFocus}
        className={className}
        size="sm"
        value={String(value ?? false)}
        onChange={(event) => onChange(event.target.value === 'true')}
      >
        <NativeSelectOption value="true">Yes</NativeSelectOption>
        <NativeSelectOption value="false">No</NativeSelectOption>
      </NativeSelect>
    )
  }

  if (options) {
    return (
      <NativeSelect
        aria-label={field.label}
        autoFocus={autoFocus}
        className={className}
        size="sm"
        value={String(value ?? '')}
        onChange={(event) => onChange(event.target.value)}
      >
        <NativeSelectOption value="" disabled={field.required}>
          {field.required ? `Select ${field.label.toLowerCase()}` : 'None'}
        </NativeSelectOption>
        {options.map((option) => (
          <NativeSelectOption key={option.value} value={option.value}>
            {option.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    )
  }

  return (
    <Input
      aria-label={field.label}
      autoFocus={autoFocus}
      className={className}
      type={
        field.value_type === 'integer' || field.value_type === 'decimal'
          ? 'number'
          : field.key === 'effectiveFrom' || field.key === 'effectiveUntil'
            ? 'date'
            : 'text'
      }
      step={field.value_type === 'decimal' ? 'any' : undefined}
      value={String(value ?? '')}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}

export function FinanceCollectionEditor({
  definition,
  rows,
  allRows,
  currencyOptions,
  editingRow,
  isNewItem,
  onAdd,
  onEdit,
  onEditChange,
  onSave,
  onDelete,
  onCancel,
  isSaving = false,
}: Props) {
  const atMaximum =
    definition.maximum_items !== null && rows.length >= definition.maximum_items
  const atMinimum = rows.length <= definition.minimum_items
  const singularLabel = definition.label.replace(/ies$/, 'y').replace(/s$/, '')
  const visibleRows = isNewItem && editingRow ? [...rows, editingRow] : rows

  function updateCurrency(row: FinanceResourceRow, code: string) {
    const currency = currencyOptions.find((option) => option.code === code)
    if (!currency) return

    onEditChange({
      ...row,
      values: {
        ...row.values,
        code: currency.code,
        name: currency.name,
        minorUnit: String(currency.decimalPlaces),
        symbol: currency.symbol,
        numericCode: '',
      },
    })
  }

  function updateEditingField(
    row: FinanceResourceRow,
    key: string,
    value: string | boolean
  ) {
    onEditChange({
      ...row,
      values: {
        ...row.values,
        [key]: value,
      },
    })
  }

  if (rows.length === 0 && !editingRow) {
    return (
      <div className="flex flex-1 items-center justify-center p-12">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <TableIcon />
            </EmptyMedia>
            <EmptyTitle>
              No {definition.label.toLowerCase()} configured
            </EmptyTitle>
          </EmptyHeader>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={atMaximum}
            onClick={onAdd}
          >
            <Plus className="size-3.5" /> Add {singularLabel}
          </Button>
        </Empty>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader className="876-header-row">
        <TableRow>
          {definition.fields.map((field) => (
            <TableHead key={field.key} className="px-5 py-3.5">
              {field.label}
            </TableHead>
          ))}
          <TableHead className="w-28 min-w-28 px-5 py-3.5" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {visibleRows.map((row) => {
          const draft = editingRow?.localId === row.localId ? editingRow : null
          const isEditing = draft !== null

          return (
            <TableRow key={row.localId} className="group transition-colors">
              {definition.fields.map((field, idx) => {
                const value = isEditing
                  ? draft.values[field.key]
                  : row.values[field.key]

                if (isEditing && definition.resource_type === 'currency') {
                  if (field.key === 'code') {
                    return (
                      <TableCell key={field.key} className="px-5 py-2">
                        <NativeSelect
                          aria-label={field.label}
                          autoFocus={idx === 0}
                          className="bg-background h-8 w-full min-w-28 text-[0.8125rem]"
                          disabled={!isNewItem}
                          size="sm"
                          value={String(value ?? '')}
                          onChange={(event) =>
                            updateCurrency(draft, event.target.value)
                          }
                        >
                          <NativeSelectOption value="" disabled>
                            Select currency
                          </NativeSelectOption>
                          {currencyOptions.map((currency) => (
                            <NativeSelectOption
                              key={currency.code}
                              value={currency.code}
                            >
                              {currency.code} — {currency.name}
                            </NativeSelectOption>
                          ))}
                        </NativeSelect>
                      </TableCell>
                    )
                  }

                  return (
                    <TableCell key={field.key} className="px-5 py-3.5">
                      {fieldDisplayValue(value)}
                    </TableCell>
                  )
                }

                if (isEditing) {
                  return (
                    <TableCell key={field.key} className="px-5 py-2">
                      <InlineFieldControl
                        field={field}
                        value={value}
                        allRows={allRows}
                        autoFocus={idx === 0}
                        onChange={(nextValue) =>
                          updateEditingField(draft, field.key, nextValue)
                        }
                      />
                    </TableCell>
                  )
                }

                if (field.value_type === 'boolean') {
                  return (
                    <TableCell key={field.key} className="px-5 py-3.5">
                      <Badge variant={value ? 'default' : 'secondary'}>
                        {value ? 'Yes' : 'No'}
                      </Badge>
                    </TableCell>
                  )
                }

                return (
                  <TableCell
                    key={field.key}
                    className={cn(
                      'px-5 py-3.5',
                      idx === 0
                        ? 'text-foreground text-[0.8125rem] font-medium'
                        : 'text-muted-foreground text-[0.8125rem]'
                    )}
                  >
                    {field.allowed_values && typeof value === 'string'
                      ? formatOptionLabel(value)
                      : fieldDisplayValue(value)}
                  </TableCell>
                )
              })}

              <TableCell className="w-28 min-w-28 px-5 py-2 text-right">
                {isEditing ? (
                  <div className="flex justify-end gap-0.5">
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`Save ${singularLabel.toLowerCase()}`}
                      onClick={() => onSave(draft)}
                      disabled={isSaving}
                      className="text-foreground size-8 shrink-0"
                    >
                      <CheckIcon className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`Cancel ${singularLabel.toLowerCase()}`}
                      onClick={onCancel}
                      disabled={isSaving}
                      className="text-muted-foreground hover:text-foreground size-8 shrink-0"
                    >
                      <XIcon className="size-4" />
                    </Button>
                  </div>
                ) : editingRow ? (
                  <div className="h-8 w-[4.25rem]" />
                ) : (
                  <div className="pointer-events-none flex justify-end gap-0.5 opacity-0 transition-opacity group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100">
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`Edit ${singularLabel.toLowerCase()}`}
                      onClick={() => onEdit(row)}
                      className="text-muted-foreground hover:text-foreground size-8 shrink-0"
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`Delete ${singularLabel.toLowerCase()}`}
                      disabled={atMinimum}
                      onClick={() => onDelete(row)}
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive size-8 shrink-0"
                    >
                      <Trash className="text-destructive size-4" />
                    </Button>
                  </div>
                )}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
