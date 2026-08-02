'use client'

import * as React from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Badge } from '@876/ui/badge'
import { DataTable } from '@876/ui/data-table'
import type { ColumnDef } from '@tanstack/react-table'

import type { VendorTableRow } from '@/types/vendor'

interface Props {
  emptyState?: React.ReactNode
  vendors: VendorTableRow[]
}

export function VendorsTable({ vendors, emptyState }: Props) {
  const router = useRouter()
  const columns: ColumnDef<VendorTableRow, unknown>[] = [
    {
      accessorKey: 'name',
      header: 'Vendor',
      cell: ({ row }) => (
        <div>
          <Link
            href={`/purchases/vendors/${row.original.id}`}
            className="font-medium hover:underline"
            onClick={(event) => event.stopPropagation()}
          >
            {row.original.name}
          </Link>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {row.original.email ?? row.original.phone ?? 'No contact details'}
          </p>
        </div>
      ),
    },
    {
      accessorKey: 'reference',
      header: 'Reference',
      cell: ({ row }) => (
        <span className="text-muted-foreground font-mono text-xs">
          {row.original.reference}
        </span>
      ),
    },
    {
      accessorKey: 'defaultCurrency',
      header: 'Currency',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge
          variant={row.original.status === 'ACTIVE' ? 'success' : 'secondary'}
        >
          {row.original.status.toLowerCase()}
        </Badge>
      ),
    },
  ]

  return (
    <div className="876-card overflow-hidden">
      <DataTable
        emptyState={emptyState}
        columns={columns}
        data={vendors}
        onRowClick={(vendor) => router.push(`/purchases/vendors/${vendor.id}`)}
      />
    </div>
  )
}
