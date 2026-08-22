'use client'

import * as React from 'react'
import type { LegacyReactTable } from '@tanstack/react-table/legacy'
import type { RowData } from '@tanstack/react-table'

import { cn } from '../lib/utils'
import { buttonVariants } from './button'
import { ChevronsUpDown } from '../icons'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu'

interface DataTableToolbarProps<TData extends RowData> {
  table: LegacyReactTable<TData>
  /** Left-side slot: search inputs, filter chips, action buttons, etc. */
  children?: React.ReactNode
  className?: string
}

/**
 * Toolbar row for a {@link DataTable}.
 *
 * Renders a flex row with:
 * - `children` on the left (search inputs, filters, bulk actions)
 * - A **Columns** visibility toggle dropdown on the right when any column
 *   supports hiding (`column.getCanHide() === true`).
 *
 * Pass this as the `toolbar` prop on `DataTable`, or compose it directly above
 * the table card when you need full layout control.
 *
 * @example
 * <DataTable
 *   columns={columns}
 *   data={data}
 *   toolbar={
 *     <DataTableToolbar table={table}>
 *       <Input placeholder="Search…" />
 *     </DataTableToolbar>
 *   }
 * />
 */
function DataTableToolbar<TData extends RowData>({
  table,
  children,
  className,
}: DataTableToolbarProps<TData>) {
  const hideableColumns = table
    .getAllLeafColumns()
    .filter((col) => col.getCanHide())

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-2 px-4 py-3',
        className
      )}
    >
      <div className="flex flex-1 items-center gap-2">{children}</div>

      {hideableColumns.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              buttonVariants({ variant: 'outline', size: 'sm' }),
              'ml-auto hidden h-8 lg:flex'
            )}
          >
            <ChevronsUpDown className="mr-2 size-4" />
            Columns
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[160px]">
            <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {hideableColumns.map((column) => (
              <DropdownMenuCheckboxItem
                key={column.id}
                className="capitalize"
                checked={column.getIsVisible()}
                onCheckedChange={(value) => column.toggleVisibility(!!value)}
              >
                {column.id}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}

export { DataTableToolbar, type DataTableToolbarProps }
