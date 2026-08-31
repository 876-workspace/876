'use client'

import { Badge } from '@876/ui/badge'
import { Button } from '@876/ui/button'
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import { Pencil, Plus, TableIcon, Trash } from '@876/ui/icons'
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
  type FinanceResourceDefinition,
  type FinanceResourceRow,
} from '../finance-provisioning-utils'

type Props = {
  definition: FinanceResourceDefinition
  rows: FinanceResourceRow[]
  onChange: (rows: FinanceResourceRow[]) => void
  onEdit: (row: FinanceResourceRow) => void
  onAdd: () => void
}

export function FinanceCollectionEditor({
  definition,
  rows,
  onChange,
  onEdit,
  onAdd,
}: Props) {
  const atMaximum =
    definition.maximum_items !== null && rows.length >= definition.maximum_items
  const atMinimum = rows.length <= definition.minimum_items

  function deleteRow(localId: string) {
    onChange(rows.filter((row) => row.localId !== localId))
  }

  if (rows.length === 0) {
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
            <Plus className="size-3.5" /> Add{' '}
            {definition.label.replace(/ies$/, 'y').replace(/s$/, '')}
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
          <TableHead className="w-20 px-5 py-3.5" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.localId} className="transition-colors">
            {definition.fields.map((field, idx) => {
              const value = row.values[field.key]
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
            <TableCell className="px-5 py-3.5 text-right">
              <div className="flex justify-end gap-1">
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  aria-label={`Edit ${definition.label}`}
                  onClick={() => onEdit(row)}
                >
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  aria-label={`Delete ${definition.label}`}
                  disabled={atMinimum}
                  onClick={() => deleteRow(row.localId)}
                >
                  <Trash className="size-3.5" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
