'use client'

import type { ReactNode } from 'react'
import type { LegacyColumnDef as ColumnDef } from '@tanstack/react-table/legacy'
import { CustomerAvatar } from '@876/ui/customer-avatar'
import { DataTable } from '@876/ui/data-table'
import { OrgAvatar as OrgLogo } from '@876/ui/org-avatar'
import { Badge } from '@876/ui/badge'
import Link from 'next/link'

export type CustomerTableRow = {
  id: string
  billingCustomerId: string
  customerName: string
  companyName: string | null
  email: string | null
  phone: string | null
  status: 'ACTIVE' | 'SUSPENDED'
  orgSlug?: string
}

type Props = {
  customers: CustomerTableRow[]
  orgSlug: string
  emptyState?: ReactNode
}

export const columns: ColumnDef<CustomerTableRow, unknown>[] = [
  {
    accessorKey: 'customerName',
    header: 'Name',
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <CustomerAvatar name={row.original.customerName} />
        <Link
          href={`/${row.original.orgSlug}/customers/${row.original.id}`}
          className="font-medium text-sky-600 dark:text-sky-400"
        >
          {row.original.customerName}
        </Link>
      </div>
    ),
  },
  {
    accessorKey: 'companyName',
    header: 'Company',
    cell: ({ row }) =>
      row.original.companyName ? (
        <span className="flex items-center gap-2.5">
          <span className="brightness-125">
            <OrgLogo name={row.original.companyName} size="sm" />
          </span>
          <span className="truncate">{row.original.companyName}</span>
        </span>
      ) : (
        <span className="text-muted-foreground">&mdash;</span>
      ),
  },
  {
    accessorKey: 'email',
    header: 'Email',
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.email ?? '—'}</span>
    ),
  },
  {
    accessorKey: 'phone',
    header: 'Phone',
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.phone ?? '—'}</span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <Badge
        variant={row.original.status === 'ACTIVE' ? 'success' : 'secondary'}
      >
        {row.original.status === 'ACTIVE' ? 'Active' : 'Suspended'}
      </Badge>
    ),
  },
]

export function CustomersTable({ customers, orgSlug, emptyState }: Props) {
  return (
    <div className="876-card overflow-hidden">
      <DataTable
        columns={columns}
        data={customers.map((customer) => ({ ...customer, orgSlug }))}
        emptyState={emptyState}
        className="text-[0.8125rem]"
        rowClassName="cursor-pointer"
      />
    </div>
  )
}
