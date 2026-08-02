'use client'

import type { ReactNode } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@876/ui/badge'
import { DataTable } from '@876/ui/data-table'

export type CustomerTableRow = {
  id: string
  billingCustomerId: string
  /** Business name for a company, person's name for an individual. */
  name: string
  /** Primary contact's name. Set for businesses; null for individuals. */
  contactName: string | null
  email: string | null
  customerKind: 'BUSINESS' | 'INDIVIDUAL' | string
  status: 'ACTIVE' | 'SUSPENDED' | string
  isCommercial: boolean
}

type Props = {
  customers: CustomerTableRow[]
  emptyState?: ReactNode
}

const columns: ColumnDef<CustomerTableRow, unknown>[] = [
  {
    id: 'customer',
    header: 'Customer',
    cell: ({ row }) => (
      <>
        <div className="font-medium">{row.original.name}</div>
        <div className="text-muted-foreground text-xs">
          {row.original.email ?? row.original.billingCustomerId}
        </div>
      </>
    ),
  },
  {
    id: 'contact',
    header: 'Contact',
    cell: ({ row }) =>
      row.original.contactName ? (
        <span className="text-sm">{row.original.contactName}</span>
      ) : (
        <span className="text-muted-foreground text-sm">&mdash;</span>
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
    header: () => <div className="text-right">Status</div>,
    cell: ({ row }) => (
      <div className="text-right">
        <Badge
          variant={row.original.status === 'ACTIVE' ? 'secondary' : 'outline'}
        >
          {row.original.status === 'ACTIVE' ? 'Active' : 'Suspended'}
        </Badge>
      </div>
    ),
  },
]

export function CustomersTable({ customers, emptyState }: Props) {
  return (
    <div className="876-card overflow-hidden">
      <DataTable columns={columns} data={customers} emptyState={emptyState} />
    </div>
  )
}
