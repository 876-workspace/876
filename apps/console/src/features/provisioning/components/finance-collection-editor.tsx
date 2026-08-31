'use client'

import { Badge } from '@876/ui/badge'
import { Button } from '@876/ui/button'
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import { Input } from '@876/ui/input'
import {
  CheckIcon,
  Pencil,
  Plus,
  TableIcon,
  Trash,
  XIcon,
} from '@876/ui/icons'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'
import { cn } from '@876/core/utils'

import {
  fieldDisplayValue,
  rowReferenceKey,
  type FinanceResourceDefinition,
  type FinanceResourceRow,
} from '../finance-provisioning-utils'

type Props = {
  definition: FinanceResourceDefinition
  rows: FinanceResourceRow[]
  allRows: FinanceResourceRow[]
  editingRow: FinanceResourceRow | null
  isNewItem: boolean
  onChange: (rows: FinanceResourceRow[]) => void
  onAdd: () => void
  onEdit: (row: FinanceResourceRow) => void
  onEditChange: (row: FinanceResourceRow) => void
  onSave: (row: FinanceResourceRow) => void
  onCancel: () => void
}

type FieldDefinition = FinanceResourceDefinition['fields'][number]

function InlineFieldControl({
  field,
  value,
  allRows,
  autoFocus,
  onChange,
}: {
  field: FieldDefinition
  value: string | boolean | undefined
  allRows: FinanceResourceRow[]
  autoFocus: boolean
  onChange: (value: string | boolean) => void
}) {
  const referenceRows = field.reference_namespace
    ? allRows.filter(
        (candidate) => candidate.resourceType === field.reference_namespace
      )
    : []
  const options = field.allowed_values
    ? field.allowed_values
    : field.value_type === 'reference' && referenceRows.length > 0
      ? referenceRows.map(rowReferenceKey).filter(Boolean)
      : null
  const className = 'h-8 min-w-28 bg-background text-[0.8125rem]'

  if (field.value_type === 'boolean') {
    return (
      <NativeSelect
        aria-label={field.label}
        autoFocus={autoFocus}
        className={className}
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
        value={String(value ?? '')}
        onChange={(event) => onChange(event.target.value)}
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
  editingRow,
  isNewItem,
  onChange,
  onAdd,
  onEdit,
  onEditChange,
  onSave,
  onCancel,
}: Props) {
  const atMaximum =
    definition.maximum_items !== null && rows.length >= definition.maximum_items
  const atMinimum = rows.length <= definition.minimum_items
  const singularLabel = definition.label
    .replace(/ies$/, 'y')
    .replace(/s$/, '')
  const visibleRows = isNewItem && editingRow ? [...rows, editingRow] : rows

  function deleteRow(localId: string) {
    onChange(rows.filter((row) => row.localId !== localId))
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
            <EmptyTitle>No {definition.label.toLowerCase()} configured</EmptyTitle>
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
          <TableHead className="w-20 px-3 py-3.5" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {visibleRows.map((row) => {
          const draft =
            editingRow?.localId === row.localId ? editingRow : null
          const isEditing = draft !== null

          return (
            <TableRow key={row.localId} className="group transition-colors">
              {definition.fields.map((field, idx) => {
                const value = isEditing
                  ? draft.values[field.key]
                  : row.values[field.key]

                if (isEditing) {
                  return (
                    <TableCell key={field.key} className="px-3 py-2">
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
                    {fieldDisplayValue(value)}
                  </TableCell>
                )
              })}

              <TableCell className="w-20 px-3 py-2 text-right">
                {isEditing ? (
                  <div className="flex h-7 justify-end gap-0.5">
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="ghost"
                      aria-label={`Save ${singularLabel.toLowerCase()}`}
                      onClick={() => onSave(draft)}
                      className="text-foreground"
                    >
                      <CheckIcon className="size-4.5" />
                    </Button>
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="ghost"
                      aria-label={`Cancel ${singularLabel.toLowerCase()}`}
                      onClick={onCancel}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <XIcon className="size-4.5" />
                    </Button>
                  </div>
                ) : editingRow ? null : (
                  <div className="pointer-events-none flex h-7 justify-end gap-0.5 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="ghost"
                      aria-label={`Edit ${singularLabel.toLowerCase()}`}
                      onClick={() => onEdit(row)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="size-4.5" />
                    </Button>
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="ghost"
                      aria-label={`Delete ${singularLabel.toLowerCase()}`}
                      disabled={atMinimum}
                      onClick={() => deleteRow(row.localId)}
                      className="text-destructive/80 hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash className="size-4.5" />
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
