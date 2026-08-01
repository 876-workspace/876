'use client'

import Link from 'next/link'
import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@876/ui/badge'
import { Button } from '@876/ui/button'
import { DataTable } from '@876/ui/data-table'

import { formatAddressLine, needsRegionReview } from '@/lib/address/format'
import type { BranchView } from '@/types/branch'

type Props = {
  branches: BranchView[]
  orgSlug: string
  emptyState?: React.ReactNode
}

type BranchTableRow = BranchView & { orgSlug: string }

const columns: ColumnDef<BranchTableRow, unknown>[] = [
  {
    id: 'branch',
    header: 'Branch',
    cell: ({ row }) => <span>{row.original.name}</span>,
  },
  {
    id: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const branch = row.original
      const flags = [
        branch.isDefault ? <Badge key="default">Default</Badge> : null,
        branch.isActive ? null : (
          <Badge key="inactive" variant="secondary">
            Inactive
          </Badge>
        ),
        needsRegionReview(branch.address) ? (
          <Badge key="region" variant="secondary">
            Region needs review
          </Badge>
        ) : null,
      ].filter((flag) => flag !== null)

      return (
        <div className="flex flex-wrap gap-1.5">
          {flags.length > 0 ? (
            flags
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>
      )
    },
  },
  {
    id: 'address',
    header: 'Address',
    cell: ({ row }) => <span>{formatAddressLine(row.original.address)}</span>,
  },
  {
    id: 'country',
    header: 'Country',
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.address.countryCode}
      </span>
    ),
  },
  {
    id: 'phone',
    header: 'Phone',
    cell: ({ row }) => <span>{row.original.phone ?? '—'}</span>,
  },
  {
    id: 'edit',
    header: () => null,
    cell: ({ row }) => (
      <Button
        variant="outline"
        size="sm"
        render={
          <Link
            href={`/org/${row.original.orgSlug}/settings/locations/${row.original.id}/edit`}
          />
        }
      >
        Edit
      </Button>
    ),
  },
]

export function LocationsTable({ branches, orgSlug, emptyState }: Props) {
  const rows: BranchTableRow[] = branches.map((branch) => ({
    ...branch,
    orgSlug,
  }))

  return (
    <div className="876-card overflow-hidden">
      <DataTable columns={columns} data={rows} emptyState={emptyState} />
    </div>
  )
}
