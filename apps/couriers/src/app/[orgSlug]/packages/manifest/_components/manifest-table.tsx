'use client'

import type { ReactNode } from 'react'
import type { LegacyColumnDef as ColumnDef } from '@tanstack/react-table/legacy'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@876/ui/badge'
import { DataTable } from '@876/ui/data-table'

export type ManifestTableRow = {
  id: string
  reference: string
  packages: string
  status: string
  orgSlug?: string
}

import { DataTableColumnHeader } from '@876/ui/data-table-column-header'

export function manifestStatusVariant(status: string): 'success' | 'secondary' {
  if (status === 'arrived' || status === 'cleared') return 'success'
  return 'secondary'
}

const columns: ColumnDef<ManifestTableRow, unknown>[] = [
  {
    accessorKey: 'reference',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Reference" />
    ),
    cell: ({ row }) => (
      <Link
        href={`/${row.original.orgSlug}/packages/manifest/${row.original.id}`}
        className="font-medium text-sky-600 dark:text-sky-400"
      >
        {row.original.reference}
      </Link>
    ),
  },
  {
    accessorKey: 'packages',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Packages" />
    ),
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.packages}</span>
    ),
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => (
      <Badge variant={manifestStatusVariant(row.original.status)}>
        {row.original.status}
      </Badge>
    ),
  },
]

export function ManifestTable({
  manifests,
  orgSlug,
  emptyState,
}: {
  manifests: ManifestTableRow[]
  orgSlug: string
  emptyState?: ReactNode
}) {
  const router = useRouter()
  const hrefFor = (id: string) => `/${orgSlug}/packages/manifest/${id}`

  return (
    <div className="876-card overflow-hidden">
      <DataTable
        columns={columns}
        data={manifests.map((manifest) => ({ ...manifest, orgSlug }))}
        rowClassName="cursor-pointer"
        onRowClick={(manifest) => router.push(hrefFor(manifest.id))}
        emptyState={emptyState}
      />
    </div>
  )
}
