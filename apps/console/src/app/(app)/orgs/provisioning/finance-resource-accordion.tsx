'use client'

import { useState } from 'react'
import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'
import { Pencil, Plus, Trash } from '@876/ui/icons'

import { DetailAccordionSection } from '@/components/detail/detail-accordion'
import {
  emptyRow,
  fieldDisplayValue,
  rowReferenceKey,
  type FinanceResourceDefinition,
  type FinanceResourceRow,
} from './finance-provisioning-utils'

type Props = {
  definition: FinanceResourceDefinition
  rows: FinanceResourceRow[]
  allRows: FinanceResourceRow[]
  onChange: (rows: FinanceResourceRow[]) => void
}

function newId() {
  return `new-${crypto.randomUUID()}`
}

export function FinanceResourceAccordion({
  definition,
  rows,
  allRows,
  onChange,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const editing = rows.find((row) => row.localId === editingId) ?? null
  const atMaximum =
    definition.maximum_items !== null && rows.length >= definition.maximum_items

  function add() {
    const row = emptyRow(definition, newId())
    onChange([...rows, row])
    setEditingId(row.localId)
  }

  return (
    <DetailAccordionSection
      title={definition.label}
      description={definition.description}
      value={definition.resource_type}
      count={rows.length}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
        <p className="text-muted-foreground text-xs">
          {definition.minimum_items > 0
            ? `At least ${definition.minimum_items} required`
            : 'Optional'}
          {definition.maximum_items !== null
            ? ` · maximum ${definition.maximum_items}`
            : ' · no fixed maximum'}
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          aria-label={`Add ${definition.label}`}
          disabled={atMaximum}
          onClick={add}
        >
          <Plus className="size-4" /> Add
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="border-border text-muted-foreground rounded-md border border-dashed p-6 text-center text-sm">
          No defaults configured.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              {definition.fields.map((field) => (
                <TableHead key={field.key}>{field.label}</TableHead>
              ))}
              <TableHead className="w-20 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.localId}>
                {definition.fields.map((field) => (
                  <TableCell key={field.key}>
                    {fieldDisplayValue(row.values[field.key])}
                  </TableCell>
                ))}
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`Edit ${definition.label}`}
                      onClick={() => setEditingId(row.localId)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`Delete ${definition.label}`}
                      disabled={rows.length <= definition.minimum_items}
                      onClick={() => {
                        onChange(
                          rows.filter((item) => item.localId !== row.localId)
                        )
                        if (editingId === row.localId) setEditingId(null)
                      }}
                    >
                      <Trash className="size-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {editing && (
        <ResourceForm
          definition={definition}
          row={editing}
          allRows={allRows}
          onChange={(next) =>
            onChange(
              rows.map((row) => (row.localId === next.localId ? next : row))
            )
          }
          onDone={() => setEditingId(null)}
        />
      )}
    </DetailAccordionSection>
  )
}

function ResourceForm({
  definition,
  row,
  allRows,
  onChange,
  onDone,
}: {
  definition: FinanceResourceDefinition
  row: FinanceResourceRow
  allRows: FinanceResourceRow[]
  onChange: (row: FinanceResourceRow) => void
  onDone: () => void
}) {
  return (
    <div className="bg-muted/30 border-border mt-5 rounded-lg border p-4">
      <div className="grid gap-4 lg:grid-cols-2">
        {definition.fields.map((field) => {
          const id = `${row.localId}-${field.key}`
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
            <div key={field.key} className="space-y-2">
              <Label htmlFor={id}>
                {field.label}
                {field.required ? ' *' : ''}
              </Label>
              {field.value_type === 'boolean' ? (
                <NativeSelect
                  id={id}
                  className="w-full"
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
                  id={id}
                  className="w-full"
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
                  id={id}
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
            </div>
          )
        })}
      </div>
      <div className="mt-4 flex justify-end">
        <Button type="button" size="sm" onClick={onDone}>
          Done
        </Button>
      </div>
    </div>
  )
}
