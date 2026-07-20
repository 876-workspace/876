'use client'

import type { ReactNode } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@876/ui/badge'
import { DataTable } from '@876/ui/data-table'

export type CustomerTableRow = {
  id: string
  name: string
  email: string | null
  customerKind: 'BUSINESS' | 'INDIVIDUAL' | string
  status: 'ACTIVE' | 'ARCHIVED' | string
  enrolled: boolean
}

type Props = {
  customers: CustomerTableRow[]
  emptyState?: ReactNode
  hasMore?: boolean
}

const columns: ColumnDef<CustomerTableRow, unknown>[] = [
  {
    id: 'customer',
    header: 'Customer',
    cell: ({ row }) => (
      <>
        <div className="font-medium">{row.original.name}</div>
        <div className="text-muted-foreground text-xs">
          {row.original.email ?? row.original.id}
        </div>
      </>
    ),
  },
  {
    id: 'type',
    header: 'Type',
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm">
        {row.original.customerKind === 'BUSINESS' ? 'Business' : 'Individual'}
      </span>
    ),
  },
  {
    id: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <Badge
        variant={row.original.status === 'ACTIVE' ? 'secondary' : 'outline'}
      >
        {row.original.status === 'ACTIVE' ? 'Active' : 'Archived'}
      </Badge>
    ),
  },
  {
    id: 'enrolled',
    header: () => <div className="text-right">Courier profile</div>,
    cell: ({ row }) => (
      <div className="text-right">
        {row.original.enrolled ? (
          <Badge variant="secondary">Enrolled</Badge>
        ) : (
          <span className="text-muted-foreground text-sm">Not enrolled</span>
        )}
      </div>
    ),
  },
]

export function CustomersTable({ customers, emptyState, hasMore }: Props) {
  return (
    <div className="876-card overflow-hidden">
      <DataTable columns={columns} data={customers} emptyState={emptyState} />
      {hasMore ? (
        <p className="text-muted-foreground border-t px-5 py-3 text-xs">
          Showing the first 100 customers.
        </p>
      ) : null}
    </div>
  )
}
