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

export function ExpensesTable({ expenses, emptyState }: Props) {
  const router = useRouter()
  const columns: ColumnDef<ExpenseRow, unknown>[] = [
    {
      id: 'expense',
      header: 'Expense',
      cell: ({ row }: any) => (
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
      header: 'Vendor',
      cell: ({ row }: any) => row.original.vendor,
    },
    {
      id: 'category',
      header: 'Category',
      cell: ({ row }: any) => (
        <span className="text-muted-foreground text-xs">
          {row.original.category}
        </span>
      ),
    },
    {
      id: 'amount',
      header: 'Amount',
      cell: ({ row }: any) =>
        formatMoney(row.original.amount, row.original.currency),
    },
    {
      id: 'date',
      header: 'Date',
      cell: ({ row }: any) => (
        <span className="text-muted-foreground text-xs">
          {formatDate(row.original.date)}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }: any) => (
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
