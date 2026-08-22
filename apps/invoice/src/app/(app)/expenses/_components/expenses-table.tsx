'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Badge } from '@876/ui/badge'
import { DataTable } from '@876/ui/data-table'
import type { LegacyColumnDef as ColumnDef } from '@tanstack/react-table/legacy'

import { formatMoney, formatDate } from '@/lib/format'

interface ExpenseRow {
  id: string
  number: string
  vendor: string
  category: string
  amount: bigint | string
  currency: string
  date: number
  status: string
}

interface Props {
  emptyState?: React.ReactNode
  expenses: ExpenseRow[]
}

import { DataTableColumnHeader } from '@876/ui/data-table-column-header'

export function ExpensesTable({ expenses, emptyState }: Props) {
  const router = useRouter()
  const columns: ColumnDef<ExpenseRow, unknown>[] = [
    {
      id: 'expense',
      accessorKey: 'number',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Expense" />
      ),
      cell: ({ row }) => (
        <Link
          href={`/expenses/${row.original.id}`}
          className="font-medium text-sky-600 hover:text-sky-700 hover:underline dark:text-sky-400 dark:hover:text-sky-300"
          onClick={(event) => event.stopPropagation()}
        >
          {row.original.number}
        </Link>
      ),
    },
    {
      id: 'vendor',
      accessorKey: 'vendor',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Vendor" />
      ),
      cell: ({ row }) => row.original.vendor,
    },
    {
      id: 'category',
      accessorKey: 'category',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Category" />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs">
          {row.original.category}
        </span>
      ),
    },
    {
      id: 'amount',
      accessorKey: 'amount',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Amount" />
      ),
      cell: ({ row }) =>
        formatMoney(row.original.amount, row.original.currency),
    },
    {
      id: 'date',
      accessorKey: 'date',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Date" />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs">
          {formatDate(row.original.date)}
        </span>
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
          <span className="capitalize">
            {row.original.status.toLowerCase()}
          </span>
        </Badge>
      ),
    },
  ]

  return (
    <div className="876-card overflow-hidden">
      <DataTable
        emptyState={emptyState}
        columns={columns}
        data={expenses}
        onRowClick={(e) => router.push(`/expenses/${e.id}`)}
      />
    </div>
  )
}
