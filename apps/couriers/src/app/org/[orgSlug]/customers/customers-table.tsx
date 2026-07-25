'use client'

import type { ReactNode } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Avatar, AvatarFallback } from '@876/ui/avatar'
import { DataTable } from '@876/ui/data-table'

import { SoftBadge } from '@/components/soft-badge'

export type CustomerTableRow = {
  id: string
  billingCustomerId: string | null
  /** Business name for a company, person's name for an individual. */
  name: string
  /** Primary contact's name. Set for businesses; null for individuals. */
  contactName: string | null
  email: string | null
  mailboxNumber: string | null
  customerKind: 'BUSINESS' | 'INDIVIDUAL' | string
  status: 'ACTIVE' | 'SUSPENDED' | string
  isCommercial: boolean
}

type Props = {
  customers: CustomerTableRow[]
  emptyState?: ReactNode
}

function customerInitials(name: string): string {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

  return initials || '?'
}

const columns: ColumnDef<CustomerTableRow, unknown>[] = [
  {
    id: 'customer',
    header: 'Customer',
    cell: ({ row }) => {
      const { name, email, billingCustomerId } = row.original

      return (
        <div className="flex min-w-0 items-center gap-4">
          <Avatar>
            <AvatarFallback>{customerInitials(name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="truncate font-medium">{name}</div>
            <div className="text-muted-foreground truncate text-xs">
              {email ?? billingCustomerId ?? '—'}
            </div>
          </div>
        </div>
      )
    },
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
    id: 'mailbox',
    header: 'Mailbox',
    cell: ({ row }) => (
      <span className="font-medium tabular-nums">
        {row.original.mailboxNumber || '—'}
      </span>
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
        <SoftBadge
          tone={row.original.status === 'ACTIVE' ? 'emerald' : 'slate'}
        >
          {row.original.status === 'ACTIVE' ? 'Active' : 'Suspended'}
        </SoftBadge>
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
