'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Badge } from '@876/ui/badge'
import { DataTable } from '@876/ui/data-table'
import { DataTableColumnHeader } from '@876/ui/data-table-column-header'
import type { LegacyColumnDef as ColumnDef } from '@tanstack/react-table/legacy'

import { formatDate } from '@/lib/format'
import type { CouriersTeamRow } from '../team-rows'
import { enumLabel } from '../labels'
import { Muted } from './cells'

export interface TeamTableProps {
  members: CouriersTeamRow[]
  baseHref: string
  emptyState?: ReactNode
}

export function TeamTable({ members, baseHref, emptyState }: TeamTableProps) {
  const router = useRouter()
  const hrefFor = (id: string) => `${baseHref}/${id}`

  const columns: ColumnDef<CouriersTeamRow, unknown>[] = [
    {
      id: 'member',
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Member" />
      ),
      cell: ({ row }) => (
        <Link
          href={hrefFor(row.original.id)}
          className="font-medium text-sky-600 hover:text-sky-700 hover:underline dark:text-sky-400 dark:hover:text-sky-300"
          onClick={(event) => event.stopPropagation()}
        >
          {row.original.name ?? row.original.userId}
        </Link>
      ),
    },
    {
      id: 'email',
      accessorKey: 'email',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Email" />
      ),
      cell: ({ row }) => <Muted>{row.original.email ?? '—'}</Muted>,
    },
    {
      id: 'role',
      accessorKey: 'roleName',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Role" />
      ),
      cell: ({ row }) => row.original.roleName,
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => (
        <Badge variant="secondary">{enumLabel(row.original.status)}</Badge>
      ),
    },
    {
      id: 'created',
      accessorKey: 'createdAt',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Added" />
      ),
      cell: ({ row }) => <Muted>{formatDate(row.original.createdAt)}</Muted>,
    },
  ]

  return (
    <div className="876-card overflow-hidden">
      <DataTable
        emptyState={emptyState}
        columns={columns}
        data={members}
        className="text-[0.8125rem]"
        onRowClick={(member) => router.push(hrefFor(member.id))}
      />
    </div>
  )
}
