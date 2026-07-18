'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ColumnDef } from '@tanstack/react-table'
import type { AdminApp, AdminFeature } from '@876/admin'
import { cn } from '@876/core/utils'
import { DataTable } from '@876/ui/data-table'

import { CursorPagination } from '@/components/cursor-pagination'
import { formatDate } from '@/lib/format'

type Props = {
  apps: AdminApp[]
  data: AdminFeature[]
  hasMore: boolean
  firstId: string | null
  lastId: string | null
  emptyState?: React.ReactNode
}

export function FeaturesTable({
  apps,
  data,
  hasMore,
  firstId,
  lastId,
  emptyState,
}: Props) {
  const router = useRouter()
  const appById = new Map(apps.map((app) => [app.id, app.name]))
  const sortedData = [...data].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  )
  const columns: ColumnDef<AdminFeature, unknown>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Link
            href={`/features/${row.original.id}`}
            className="hover:text-primary font-medium"
            onClick={(e) => e.stopPropagation()}
          >
            {row.original.name}
          </Link>
        </div>
      ),
    },
    {
      accessorKey: 'slug',
      header: 'Slug',
      cell: ({ row }) => (
        <span className="text-muted-foreground font-mono text-xs">
          {row.original.slug}
        </span>
      ),
    },
    {
      accessorKey: 'app_id',
      header: 'App',
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {row.original.app_id
            ? (appById.get(row.original.app_id) ?? row.original.app_id)
            : 'Platform-wide'}
        </span>
      ),
    },
    {
      accessorKey: 'scope',
      header: 'Scope',
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm capitalize">
          {row.original.scope}
        </span>
      ),
    },
    {
      accessorKey: 'enabled',
      header: 'Enabled',
      cell: ({ row }) => (
        <span
          className={cn(
            'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
            row.original.enabled
              ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300'
              : 'border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400'
          )}
        >
          {row.original.enabled ? 'Enabled' : 'Disabled'}
        </span>
      ),
    },
    {
      accessorKey: 'updated_at',
      header: 'Updated',
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {formatDate(row.original.updated_at)}
        </span>
      ),
    },
  ]

  return (
    <div className="876-card overflow-hidden">
      <DataTable
        columns={columns}
        data={sortedData}
        emptyState={emptyState}
        onRowClick={(feature) => router.push(`/features/${feature.id}`)}
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
