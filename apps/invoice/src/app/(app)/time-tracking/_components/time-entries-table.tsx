'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Badge } from '@876/ui/badge'
import { DataTable } from '@876/ui/data-table'
import type { LegacyColumnDef as ColumnDef } from '@tanstack/react-table/legacy'

import { formatMoney } from '@/lib/format'

interface TimeEntryRow {
  id: string
  task: string
  customer: string
  hours: number
  rate: bigint | string
  currency: string
  status: string
}

interface Props {
  emptyState?: React.ReactNode
  entries: TimeEntryRow[]
}

import { DataTableColumnHeader } from '@876/ui/data-table-column-header'

export function TimeEntriesTable({ entries, emptyState }: Props) {
  const router = useRouter()
  const columns: ColumnDef<TimeEntryRow, unknown>[] = [
    {
      id: 'task',
      accessorKey: 'task',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Task" />
      ),
      cell: ({ row }) => (
        <Link
          href={`/time-tracking/${row.original.id}`}
          className="font-medium text-sky-600 hover:text-sky-700 hover:underline dark:text-sky-400 dark:hover:text-sky-300"
          onClick={(event) => event.stopPropagation()}
        >
          {row.original.task}
        </Link>
      ),
    },
    {
      id: 'customer',
      accessorKey: 'customer',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Customer" />
      ),
      cell: ({ row }) => row.original.customer,
    },
    {
      id: 'hours',
      accessorKey: 'hours',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Hours" />
      ),
      cell: ({ row }) => (
        <span className="tabular-nums">{row.original.hours.toFixed(2)}</span>
      ),
    },
    {
      id: 'rate',
      accessorKey: 'rate',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Rate" />
      ),
      cell: ({ row }) => formatMoney(row.original.rate, row.original.currency),
    },
    {
      id: 'amount',
      enableSorting: false,
      header: 'Amount',
      cell: ({ row }) =>
        formatMoney(
          BigInt(Math.round(row.original.hours * Number(row.original.rate))),
          row.original.currency
        ),
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => (
        <Badge
          variant={row.original.status === 'BILLED' ? 'success' : 'secondary'}
        >
          {row.original.status}
        </Badge>
      ),
    },
  ]

  return (
    <div className="876-card overflow-hidden">
      <DataTable
        emptyState={emptyState}
        columns={columns}
        data={entries}
        onRowClick={(e) => router.push(`/time-tracking/${e.id}`)}
      />
    </div>
  )
}
