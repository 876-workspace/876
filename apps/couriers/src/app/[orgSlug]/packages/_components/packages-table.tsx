'use client'

import type { ReactNode } from 'react'
import type { LegacyColumnDef as ColumnDef } from '@tanstack/react-table/legacy'
import { Avatar, AvatarFallback } from '@876/ui/avatar'
import { DataTable } from '@876/ui/data-table'
import { DataTableColumnHeader } from '@876/ui/data-table-column-header'

export type PackageTableRow = {
  id: string
  customerName: string
  description: string
  trackingNumber: string
  branch: string
  status: string
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

function branchColor(branch: string): string {
  return (
    {
      'New Kingston': 'border-sky-400',
      'Half Way Tree': 'border-violet-400',
      Portmore: 'border-emerald-400',
      'Spanish Town': 'border-amber-400',
    }[branch] ?? 'border-border'
  )
}

function statusClass(status: string): string {
  if (status === 'Collected' || status === 'Arrived')
    return 'bg-emerald-50 text-emerald-700 dark:bg-transparent dark:text-emerald-400'
  if (status === 'Ready for pickup')
    return 'bg-blue-50 text-blue-700 dark:bg-transparent dark:text-blue-400'
  if (status === 'In transit' || status === 'Received')
    return 'bg-violet-50 text-violet-700 dark:bg-transparent dark:text-violet-400'
  if (status === 'Pre-alert')
    return 'bg-amber-50 text-amber-700 dark:bg-transparent dark:text-amber-400'
  if (status === 'Unclaimed')
    return 'bg-rose-50 text-rose-700 dark:bg-transparent dark:text-rose-400'
  return 'bg-muted text-muted-foreground dark:bg-transparent'
}

const columns: ColumnDef<PackageTableRow, unknown>[] = [
  {
    accessorKey: 'trackingNumber',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Tracking #" />
    ),
    cell: ({ row }) => (
      <span className="font-medium text-sky-600">
        {row.original.trackingNumber}
      </span>
    ),
  },
  {
    accessorKey: 'customerName',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Customer" />
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <Avatar className="size-6 rounded-md">
          <AvatarFallback
            className={`rounded-md text-[0.625rem] font-medium ${avatarColor(row.original.customerName)}`}
          >
            {row.original.customerName
              .split(' ')
              .map((part) => part[0])
              .join('')
              .slice(0, 2)}
          </AvatarFallback>
        </Avatar>
        <span className="font-medium text-sky-600">
          {row.original.customerName}
        </span>
      </div>
    ),
  },
  {
    accessorKey: 'description',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Description" />
    ),
  },
  {
    accessorKey: 'branch',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Branch" />
    ),
    cell: ({ row }) => (
      <span
        className={`text-muted-foreground rounded-full border bg-transparent px-2 py-1 text-xs font-medium ${branchColor(row.original.branch)}`}
      >
        {row.original.branch}
      </span>
    ),
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => (
      <span
        className={`rounded-full px-2 py-1 text-[0.6875rem] font-medium ${statusClass(row.original.status)}`}
      >
        {row.original.status}
      </span>
    ),
  },
]

export function PackagesTable({
  packages,
  emptyState,
}: {
  packages: PackageTableRow[]
  emptyState?: ReactNode
}) {
  return (
    <div className="876-card overflow-hidden">
      <DataTable
        columns={columns}
        data={packages}
        emptyState={emptyState}
        rowClassName="cursor-pointer"
      />
    </div>
  )
}
