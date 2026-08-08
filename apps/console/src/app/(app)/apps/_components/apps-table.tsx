'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ColumnDef } from '@tanstack/react-table'
import type { AdminApp } from '@876/admin'
import { cn } from '@876/core/utils'
import { Badge } from '@876/ui/badge'
import { DataTable } from '@876/ui/data-table'
import { OrgAvatar as AppLogo } from '@876/ui/org-avatar'

import { CursorPagination } from '@/components/patterns/cursor-pagination'
import { statusBadgeClass } from '@/lib/format'

function appKindBadgeVariant(
  appKind: AdminApp['app_kind']
): 'success' | 'info' | 'secondary' {
  if (appKind === 'product') return 'success'
  if (appKind === 'platform') return 'info'
  return 'secondary'
}

const columns: ColumnDef<AdminApp, unknown>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
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
    accessorKey: 'app_kind',
    header: 'Type',
    cell: ({ row }) => (
      <Badge
        variant={appKindBadgeVariant(row.original.app_kind)}
        className="capitalize"
      >
        {row.original.app_kind}
      </Badge>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
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
