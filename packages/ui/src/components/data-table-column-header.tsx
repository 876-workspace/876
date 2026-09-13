'use client'

import * as React from 'react'
import type { LegacyColumn } from '@tanstack/react-table/legacy'
import type { RowData } from '@tanstack/react-table'

import { cn } from '../lib/utils'
import { Button } from './button'
import { ChevronUp, ChevronDown, ChevronsUpDown } from '../icons'

interface DataTableColumnHeaderProps<
  TData extends RowData,
  TValue,
> extends React.HTMLAttributes<HTMLDivElement> {
  column: LegacyColumn<TData, TValue>
  title: string
}

/**
 * Sortable column header button for use inside a TanStack Table `ColumnDef`.
 *
 * Renders a ghost button with the column label and a sort direction icon.
 * Columns where `column.getCanSort()` is `false` render a plain `<span>`.
 *
 * @example
 * const columns: ColumnDef<User>[] = [
 *   {
 *     accessorKey: 'name',
 *     header: ({ column }) => (
 *       <DataTableColumnHeader column={column} title="Name" />
 *     ),
 *   },
 * ]
 */
function DataTableColumnHeader<TData extends RowData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort())
    return (
      <div className={cn('flex items-center space-x-2', className)}>
        <span>{title}</span>
      </div>
    )

  const sorted = column.getIsSorted()
  const toggleSorting = column.getToggleSortingHandler()

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <Button
        variant="ghost"
        size="sm"
        className="group/sort -ml-3 h-8"
        onClick={(event) => {
          event.stopPropagation()
          toggleSorting?.(event)
        }}
      >
        <span>{title}</span>
        {sorted === 'desc' ? (
          <ChevronDown className="ml-2 size-4" />
        ) : sorted === 'asc' ? (
          <ChevronUp className="ml-2 size-4" />
        ) : (
          // An unsorted column only hints that it can sort on hover or focus;
          // a chevron pair on every header at rest reads as noise.
          <ChevronsUpDown
            aria-hidden
            className="ml-2 size-4 opacity-0 transition-opacity group-hover/sort:opacity-100 group-focus-visible/sort:opacity-100"
          />
        )}
      </Button>
    </div>
  )
}

export { DataTableColumnHeader, type DataTableColumnHeaderProps }
