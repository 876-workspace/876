'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CustomerAvatar } from '@876/ui/customer-avatar'
import { DataTable } from '@876/ui/data-table'
import type { LegacyColumnDef as ColumnDef } from '@tanstack/react-table/legacy'

import { formatMoney } from '@/lib/format'

export interface CustomerRow {
  id: string
  name: string
  companyName: string | null
  contactName: string | null
  phone: string | null
  receivables: string
  currency: string
}

interface Props {
  emptyState?: React.ReactNode
  customers: CustomerRow[]
}

import { DataTableColumnHeader } from '@876/ui/data-table-column-header'

export function CustomersTable({ customers, emptyState }: Props) {
  const router = useRouter()
  const columns: ColumnDef<CustomerRow, unknown>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Customer" />
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <CustomerAvatar name={row.original.name} />
          <Link
            href={`/customers/${row.original.id}`}
            className="font-medium text-sky-600 hover:text-sky-700 hover:underline dark:text-sky-400 dark:hover:text-sky-300"
            onClick={(event) => event.stopPropagation()}
          >
            {row.original.name}
          </Link>
        </div>
      ),
    },
    {
      accessorKey: 'companyName',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Company" />
      ),
      cell: ({ row }) => (
        <span
          className={
            row.original.companyName
              ? 'text-foreground'
              : 'text-muted-foreground'
          }
        >
          {row.original.companyName ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'contactName',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Contact" />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.contactName ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'phone',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Phone" />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.phone ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'receivables',
      header: ({ column }) => (
        <div className="flex justify-end">
          <DataTableColumnHeader column={column} title="Receivables" />
        </div>
      ),
      cell: ({ row }) => (
        <div className="text-right font-medium tabular-nums">
          {formatMoney(row.original.receivables, row.original.currency)}
        </div>
      ),
    },
  ]

  return (
    <div className="876-card overflow-hidden">
      <DataTable
        emptyState={emptyState}
        columns={columns}
        data={customers}
        className="text-[0.8125rem]"
        onRowClick={(customer) => router.push(`/customers/${customer.id}`)}
      />
    </div>
  )
}
