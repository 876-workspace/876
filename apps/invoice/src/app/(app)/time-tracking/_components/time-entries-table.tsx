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

export function TimeEntriesTable({ entries, emptyState }: Props) {
  const router = useRouter()
  const columns: ColumnDef<TimeEntryRow, unknown>[] = [
    {
      id: 'task',
      header: 'Task',
      cell: ({ row }: any) => (
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
      header: 'Customer',
      cell: ({ row }: any) => row.original.customer,
    },
    {
      id: 'hours',
      header: 'Hours',
      cell: ({ row }: any) => (
        <span className="tabular-nums">{row.original.hours.toFixed(2)}</span>
      ),
    },
    {
      id: 'rate',
      header: 'Rate',
      cell: ({ row }: any) =>
        formatMoney(row.original.rate, row.original.currency),
    },
    {
      id: 'amount',
      header: 'Amount',
      cell: ({ row }: any) =>
        formatMoney(
          BigInt(Math.round(row.original.hours * Number(row.original.rate))),
          row.original.currency
        ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }: any) => (
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
