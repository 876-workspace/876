'use client'

import type { ReactNode } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Avatar, AvatarFallback } from '@876/ui/avatar'
import { DataTable } from '@876/ui/data-table'

export type CustomerTableRow = {
  id: string
  name: string
  email: string | null
  organization: string | null
  mailboxNumber: string | null
}

type Props = {
  customers: CustomerTableRow[]
  emptyState?: ReactNode
  hasMore?: boolean
}

function customerInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

const columns: ColumnDef<CustomerTableRow, unknown>[] = [
  {
    id: 'name',
    header: 'Name',
    cell: ({ row }) => {
      const { name, email, id } = row.original

      return (
        <div className="flex min-w-0 items-center gap-4">
          <Avatar>
            <AvatarFallback>{customerInitials(name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="truncate font-medium">{name}</div>
            <div className="text-muted-foreground truncate text-xs">
              {email ?? id}
            </div>
          </div>
        </div>
      )
    },
  },
  {
    id: 'organization',
    header: 'Organization',
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm">
        {row.original.organization || '—'}
      </span>
    ),
  },
  {
    id: 'mailbox',
    header: 'Mailbox',
    cell: ({ row }) => (
      <span className="font-medium tabular-nums">
        {row.original.mailboxNumber || '—'}
      </span>
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
