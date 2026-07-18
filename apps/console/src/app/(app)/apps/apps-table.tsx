'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ColumnDef } from '@tanstack/react-table'
import type { AdminApp, AdminOrganization } from '@876/admin'
import { cn } from '@876/core/utils'
import { DataTable } from '@876/ui/data-table'
import { OrgAvatar as AppLogo, OrgAvatar as OrgLogo } from '@876/ui/org-avatar'

import { CursorPagination } from '@/components/cursor-pagination'
import { formatDate, statusBadgeClass } from '@/lib/format'

type RowData = AdminApp & { _org: AdminOrganization | null }

const columns: ColumnDef<RowData, unknown>[] = [
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
          className="hover:text-primary font-medium"
          onClick={(e) => e.stopPropagation()}
        >
          {row.original.name}
        </Link>
      </div>
    ),
  },
  {
    accessorKey: 'organization_id',
    header: 'Organization',
    cell: ({ row }) => {
      const org = row.original._org
      if (!org) return <span className="text-muted-foreground text-sm">—</span>
      return (
        <span className="flex items-center gap-2.5 text-sm">
          <OrgLogo name={org.name ?? org.slug} src={org.logo_url} size="sm" />
          <span className="truncate">{org.name ?? org.slug}</span>
        </span>
      )
    },
  },
  {
    accessorKey: 'app_kind',
    header: 'Type',
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm capitalize">
        {row.original.app_kind}
      </span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <span
        className={cn(
          'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium capitalize',
          statusBadgeClass(row.original.status)
        )}
      >
        {row.original.status}
      </span>
    ),
  },
  {
    accessorKey: 'created_at',
    header: 'Created',
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm">
        {formatDate(row.original.created_at)}
      </span>
    ),
  },
]

type Props = {
  data: AdminApp[]
  orgMap: Record<string, AdminOrganization>
  hasMore: boolean
  firstId: string | null
  lastId: string | null
}

export function AppsTable({ data, orgMap, hasMore, firstId, lastId }: Props) {
  const router = useRouter()

  const rows: RowData[] = data.map((app) => ({
    ...app,
    _org: app.organization_id ? (orgMap[app.organization_id] ?? null) : null,
  }))

  return (
    <div className="876-card overflow-hidden">
      <DataTable
        columns={columns}
        data={rows}
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
