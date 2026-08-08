'use client'

import type { ReactNode } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Avatar, AvatarFallback } from '@876/ui/avatar'
import { DataTable } from '@876/ui/data-table'
import { OrgAvatar as OrgLogo } from '@876/ui/org-avatar'

export type CustomerTableRow = {
  id: string
  billingCustomerId: string
  customerName: string
  companyName: string | null
  email: string | null
  phone: string | null
  mailboxNumber: string | null
}

type Props = {
  customers: CustomerTableRow[]
  emptyState?: ReactNode
}

function initialsOf(name: string): string {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?'
  )
}

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-violet-100 text-violet-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-cyan-100 text-cyan-700',
]

function avatarColor(name: string): string {
  let hash = 0
  for (let index = 0; index < name.length; index++)
    hash = (hash * 31 + name.charCodeAt(index)) | 0

  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]!
}

const columns: ColumnDef<CustomerTableRow, unknown>[] = [
  {
    accessorKey: 'customerName',
    header: 'Name',
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <Avatar className="size-6 shrink-0 rounded-md after:rounded-md">
          <AvatarFallback
            className={`rounded-md text-[0.5625rem] ${avatarColor(row.original.customerName)}`}
          >
            {initialsOf(row.original.customerName)}
          </AvatarFallback>
        </Avatar>
        <span className="font-medium text-sky-600 dark:text-sky-400">
          {row.original.customerName}
        </span>
      </div>
    ),
  },
  {
    accessorKey: 'companyName',
    header: 'Company',
    cell: ({ row }) =>
      row.original.companyName ? (
        <span className="flex items-center gap-2.5 text-sm">
          <span className="brightness-125">
            <OrgLogo name={row.original.companyName} size="sm" />
          </span>
          <span className="truncate">{row.original.companyName}</span>
        </span>
      ) : (
        <span className="text-muted-foreground text-sm">&mdash;</span>
      ),
  },
  {
    accessorKey: 'mailboxNumber',
    header: 'Mailboxmake ',
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm">
        {row.original.mailboxNumber ?? '—'}
      </span>
    ),
  },
  {
    accessorKey: 'email',
    header: 'Email',
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm">
        {row.original.email ?? '—'}
      </span>
    ),
  },
  {
    accessorKey: 'phone',
    header: 'Phone',
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm">
        {row.original.phone ?? '—'}
      </span>
    ),
  },
]

export function CustomersTable({ customers, emptyState }: Props) {
  return (
    <div className="876-card overflow-hidden">
      <DataTable
        columns={columns}
        data={customers}
        emptyState={emptyState}
        rowClassName="cursor-pointer"
      />
    </div>
  )
}
