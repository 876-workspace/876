'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { LegacyColumnDef as ColumnDef } from '@tanstack/react-table/legacy'
import type { AdminApp } from '@876/admin'
import { cn } from '@876/core/utils'
import { Badge } from '@876/ui/badge'
import { DataTable } from '@876/ui/data-table'
import { DataTableColumnHeader } from '@876/ui/data-table-column-header'
import { OrgAvatar as AppLogo } from '@876/ui/org-avatar'

import { CursorPagination } from '@/components/patterns/cursor-pagination'
import { statusBadgeClass } from '@/lib/format'

function appKindBadgeClass(appKind: AdminApp['app_kind']): string {
  if (appKind === 'product') return 'border-emerald-400'
  if (appKind === 'platform') return 'border-blue-400'
  if (appKind === 'internal') return 'border-violet-400'
  return 'border-border'
}

const columns: ColumnDef<AdminApp, unknown>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <AppLogo
          name={row.original.name}
          src={row.original.logo_url}
          size="sm"
        />
        <Link
          href={`/apps/${row.original.slug}`}
          className="font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
          onClick={(e) => e.stopPropagation()}
        >
          {row.original.name}
        </Link>
      </div>
    ),
  },
  {
    accessorKey: 'homepage_url',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="URL" />
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground max-w-64 truncate text-[0.8125rem]">
        {row.original.homepage_url ?? '—'}
      </span>
    ),
  },
  {
    accessorKey: 'app_kind',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Type" />
    ),
    cell: ({ row }) => (
      <Badge
        variant="outline"
        className={`text-muted-foreground rounded-full border bg-transparent px-2 py-1 text-xs font-medium capitalize ${appKindBadgeClass(row.original.app_kind)}`}
      >
        {row.original.app_kind}
      </Badge>
    ),
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => (
      <Badge
        variant="outline"
        className={cn('capitalize', statusBadgeClass(row.original.status))}
      >
        {row.original.status}
      </Badge>
    ),
  },
]

type Props = {
  data: AdminApp[]
  hasMore: boolean
  firstId: string | null
  lastId: string | null
}

export function AppsTable({ data, hasMore, firstId, lastId }: Props) {
  const router = useRouter()

  return (
    <div className="876-card overflow-hidden">
      <DataTable
        columns={columns}
        data={data}
        onRowClick={(app) => router.push(`/apps/${app.slug}`)}
      />
      <CursorPagination
        firstId={firstId}
        lastId={lastId}
        hasMore={hasMore}
        count={data.length}
      />
    </div>
  )
}
