'use client'

import * as React from 'react'
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'

import { cn } from '../lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './table'

interface DataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[]
  data: TData[]
  onRowClick?: (row: TData) => void
  emptyState?: React.ReactNode
  className?: string
  rowClassName?: string | ((row: TData) => string)
  layout?: 'table' | 'grid'
}

export function DataTable<TData>({
  columns,
  data,
  onRowClick,
  emptyState,
  className,
  rowClassName,
  layout = 'table',
}: DataTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([])

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  if (layout === 'grid') {
    if (data.length === 0 && emptyState) return <>{emptyState}</>

    return (
      <div
        className={cn(
          'grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3',
          className
        )}
      >
        {table.getRowModel().rows.map((row) => {
          const visibleCells = row.getVisibleCells()
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
              onClick={onRowClick ? () => onRowClick(row.original) : undefined}
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
    )
  }

  return (
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
            <TableCell colSpan={columns.length} className="px-5 py-8">
              {emptyState}
            </TableCell>
          </TableRow>
        ) : (
          table.getRowModel().rows.map((row) => (
            <TableRow
              key={row.id}
              className={cn(
                onRowClick && 'cursor-pointer',
                typeof rowClassName === 'function'
                  ? rowClassName(row.original)
                  : rowClassName
              )}
              onClick={onRowClick ? () => onRowClick(row.original) : undefined}
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
  )
}
