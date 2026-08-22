'use client'

import * as React from 'react'
import {
  type LegacyColumnDef,
  type LegacyReactTable,
  getCoreRowModel,
  getSortedRowModel,
  useLegacyTable,
} from '@tanstack/react-table/legacy'
import {
  flexRender,
  type RowSelectionState,
  type SortingState,
  type ColumnVisibilityState,
  type RowData,
} from '@tanstack/react-table'

import { cn } from '../lib/utils'
import { Checkbox } from './checkbox'
import { DataTableToolbar } from './data-table-toolbar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './table'

interface DataTableProps<TData extends RowData> {
  columns: LegacyColumnDef<TData, unknown>[]
  data: TData[]
  onRowClick?: (row: TData) => void
  emptyState?: React.ReactNode
  className?: string
  rowClassName?: string | ((row: TData) => string)
  layout?: 'table' | 'grid'
  /**
   * Optional toolbar content rendered above the table. When column visibility
   * is enabled, this content is placed in the left side of the shared toolbar.
   */
  toolbar?: React.ReactNode
  /**
   * Enable per-column visibility toggles. Columns opt-in by **not** setting
   * `enableHiding: false` in their `LegacyColumnDef`.
   */
  enableColumnVisibility?: boolean
  /** Initial column visibility state. Only applied on first mount. */
  defaultColumnVisibility?: ColumnVisibilityState
  /**
   * Prepend a checkbox column and enable row multi-selection.
   * Selected rows are reported via `onRowSelectionChange`.
   */
  enableRowSelection?: boolean
  /** Called whenever the row selection changes. */
  onRowSelectionChange?: (rows: TData[]) => void
}

function DataTable<TData extends RowData>({
  columns,
  data,
  onRowClick,
  emptyState,
  className,
  rowClassName,
  layout = 'table',
  toolbar,
  enableColumnVisibility = false,
  defaultColumnVisibility,
  enableRowSelection = false,
  onRowSelectionChange,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnVisibility, setColumnVisibility] =
    React.useState<ColumnVisibilityState>(defaultColumnVisibility ?? {})
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})

  const selectionColumn: LegacyColumnDef<TData, unknown> = React.useMemo(
    () =>
      ({
        id: 'select',
        enableSorting: false,
        enableHiding: false,
        size: 36,
        header: ({ table }: { table: LegacyReactTable<TData> }) => {
          const allSelected = table.getIsAllPageRowsSelected()
          const someSelected = table.getIsSomePageRowsSelected()

          return (
            <Checkbox
              checked={allSelected}
              indeterminate={!allSelected && someSelected}
              onCheckedChange={(checked) =>
                table.toggleAllPageRowsSelected(!!checked)
              }
              aria-label="Select all"
            />
          )
        },
        cell: ({
          row,
        }: {
          row: {
            getIsSelected: () => boolean
            getCanSelect: () => boolean
            toggleSelected: (value?: boolean) => void
          }
        }) => (
          <Checkbox
            checked={row.getIsSelected()}
            disabled={!row.getCanSelect()}
            onClick={(event) => event.stopPropagation()}
            onCheckedChange={(checked) => row.toggleSelected(!!checked)}
            aria-label="Select row"
          />
        ),
      }) as unknown as LegacyColumnDef<TData, unknown>,
    []
  )

  const resolvedColumns = React.useMemo(
    () => (enableRowSelection ? [selectionColumn, ...columns] : columns),
    [enableRowSelection, selectionColumn, columns]
  )

  const table = useLegacyTable<TData>({
    data,
    columns: resolvedColumns,
    state: {
      sorting,
      columnVisibility: enableColumnVisibility ? columnVisibility : {},
      rowSelection,
    },
    enableRowSelection,
    onSortingChange: setSorting,
    onColumnVisibilityChange: enableColumnVisibility
      ? setColumnVisibility
      : undefined,
    onRowSelectionChange: (
      updater:
        | RowSelectionState
        | ((old: RowSelectionState) => RowSelectionState)
    ) => {
      const next =
        typeof updater === 'function' ? updater(rowSelection) : updater
      setRowSelection(next)
      if (onRowSelectionChange) {
        const selectedRows = data.filter((_, idx) => next[idx])
        onRowSelectionChange(selectedRows)
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const resolvedToolbar = enableColumnVisibility ? (
    <DataTableToolbar table={table}>{toolbar}</DataTableToolbar>
  ) : (
    toolbar
  )

  if (layout === 'grid') {
    return (
      <>
        {resolvedToolbar}
        {data.length === 0 && emptyState ? (
          <>{emptyState}</>
        ) : (
          <div
            className={cn(
              'grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3',
              className
            )}
          >
            {table.getRowModel().rows.map((row) => {
              const visibleCells = row
                .getVisibleCells()
                .filter((cell) => cell.column.id !== 'select')
              const firstCell = visibleCells[0]
              const otherCells = visibleCells.slice(1)

              return (
                <div
                  key={row.id}
                  className={cn(
                    '876-card group flex flex-col overflow-hidden transition-all duration-300 ease-out',
                    onRowClick &&
                      '876-card-interactive cursor-pointer hover:-translate-y-1'
                  )}
                  onClick={
                    onRowClick
                      ? () => onRowClick(row.original as TData)
                      : undefined
                  }
                >
                  {firstCell && (
                    <div className="border-border/40 flex items-center border-b bg-black/5 px-6 py-4 transition-colors group-hover:bg-black/[0.07] dark:bg-white/[0.03] dark:group-hover:bg-white/[0.06]">
                      <div className="truncate text-base font-semibold">
                        {flexRender(
                          firstCell.column.columnDef.cell,
                          firstCell.getContext()
                        )}
                      </div>
                    </div>
                  )}
                  {otherCells.length > 0 && (
                    <div className="px-6 py-6">
                      <dl className="grid grid-cols-2 gap-x-4 gap-y-6">
                        {otherCells.map((cell) => (
                          <div key={cell.id} className="flex flex-col gap-1.5">
                            <dt className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
                              {(() => {
                                const header = table
                                  .getFlatHeaders()
                                  .find((h) => h.column.id === cell.column.id)
                                return header && !header.isPlaceholder
                                  ? flexRender(
                                      header.column.columnDef.header,
                                      header.getContext()
                                    )
                                  : null
                              })()}
                            </dt>
                            <dd className="text-foreground text-sm">
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext()
                              )}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </>
    )
  }

  return (
    <>
      {resolvedToolbar}
      <Table className={className}>
        <TableHeader className="876-header-row">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const canSort = header.column.getCanSort()
                return (
                  <TableHead
                    key={header.id}
                    className={cn(
                      'px-5 py-3.5',
                      canSort && 'cursor-pointer select-none'
                    )}
                    style={
                      header.column.columnDef.size !== undefined
                        ? { width: header.column.getSize() }
                        : undefined
                    }
                    onClick={
                      canSort
                        ? header.column.getToggleSortingHandler()
                        : undefined
                    }
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                )
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length === 0 && emptyState ? (
            <TableRow>
              <TableCell
                colSpan={table.getVisibleLeafColumns().length}
                className="px-5 py-8"
              >
                {emptyState}
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() ? 'selected' : undefined}
                className={cn(
                  onRowClick && 'cursor-pointer',
                  typeof rowClassName === 'function'
                    ? rowClassName(row.original as TData)
                    : rowClassName
                )}
                onClick={
                  onRowClick ? () => onRowClick(row.original as TData) : undefined
                }
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className="px-5 py-4"
                    style={
                      cell.column.columnDef.size !== undefined
                        ? { width: cell.column.getSize() }
                        : undefined
                    }
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </>
  )
}

export { DataTable, type DataTableProps }
