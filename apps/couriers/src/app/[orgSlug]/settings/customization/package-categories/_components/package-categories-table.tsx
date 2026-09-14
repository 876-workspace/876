'use client'

import type { LegacyColumnDef as ColumnDef } from '@tanstack/react-table/legacy'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Badge } from '@876/ui/badge'
import { DataTable } from '@876/ui/data-table'
import { DataTableColumnHeader } from '@876/ui/data-table-column-header'
import type { PackageCategory } from '@876/couriers/admin'

export type PackageCategoryTableRow = PackageCategory & { orgSlug?: string }

type Props = {
  categories: PackageCategory[]
  orgSlug: string
  emptyState?: React.ReactNode
}

export const columns: ColumnDef<PackageCategoryTableRow, unknown>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => (
      <Link
        href={`/${row.original.orgSlug}/settings/customization/package-categories/${row.original.id}/edit`}
        className="font-medium text-sky-600 dark:text-sky-400"
      >
        {row.original.name}
      </Link>
    ),
  },
  {
    accessorKey: 'slug',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Slug" />
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.slug}</span>
    ),
  },
  {
    accessorKey: 'description',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Description" />
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground block max-w-md truncate">
        {row.original.description ?? '—'}
      </span>
    ),
  },
  {
    accessorKey: 'sort_order',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Order" />
    ),
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.sort_order}</span>
    ),
  },
  {
    accessorKey: 'is_active',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) =>
      row.original.is_active ? (
        <Badge variant="success">Active</Badge>
      ) : (
        <Badge variant="secondary">Inactive</Badge>
      ),
  },
  {
    accessorKey: 'provisioning_key',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Source" />
    ),
    cell: ({ row }) =>
      row.original.provisioning_key ? (
        <Badge variant="outline">Default</Badge>
      ) : (
        <span className="text-muted-foreground">Custom</span>
      ),
  },
]

export function PackageCategoriesTable({
  categories,
  orgSlug,
  emptyState,
}: Props) {
  const router = useRouter()
  const hrefFor = (id: string) =>
    `/${orgSlug}/settings/customization/package-categories/${encodeURIComponent(id)}/edit`

  return (
    <div className="876-card overflow-hidden">
      <DataTable
        columns={columns}
        data={categories.map((category) => ({ ...category, orgSlug }))}
        onRowClick={(category) => router.push(hrefFor(category.id))}
        emptyState={
          emptyState ?? (
            <div className="text-muted-foreground py-6 text-center text-[0.8125rem]">
              No package categories.
            </div>
          )
        }
        className="text-[0.8125rem]"
        rowClassName="cursor-pointer"
      />
    </div>
  )
}
