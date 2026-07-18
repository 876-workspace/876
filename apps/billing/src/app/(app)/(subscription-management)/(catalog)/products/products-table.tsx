'use client'

import * as React from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DataTable } from '@876/ui/data-table'
import type { ColumnDef } from '@tanstack/react-table'

import { ResourceRowLink } from '@/components/resource-row-link'

type Props = {
  emptyState?: React.ReactNode
  products: ProductRow[]
}

interface ProductRow {
  id: string
  name: string
  slug: string
  sourceAppId: string | null
  isActive: boolean
  plans: unknown[]
}

export function ProductsTable({ products, emptyState }: Props) {
  const router = useRouter()
  const columns: ColumnDef<ProductRow, unknown>[] = [
    {
      id: 'product',
      header: 'Product',
      cell: ({ row }) => {
        const product = row.original
        return (
          <>
            <Link
              href={`/products/${product.id}`}
              className="font-medium hover:underline"
              onClick={(event) => event.stopPropagation()}
            >
              {product.name}
            </Link>
            <p className="text-muted-foreground mt-0.5 font-mono text-xs">
              {product.slug}
            </p>
          </>
        )
      },
    },
    {
      id: 'plans',
      header: 'Plans',
      cell: ({ row }) =>
        `${row.original.plans.length} plan${row.original.plans.length === 1 ? '' : 's'}`,
    },
    {
      id: 'source',
      header: 'Source',
      cell: ({ row }) => (
        <span className="text-muted-foreground font-mono text-xs">
          {row.original.sourceAppId ?? 'Standalone'}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <span className="text-xs">
          {row.original.isActive ? 'Active' : 'Archived'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <ResourceRowLink
            href={`/products/${row.original.id}`}
            resourceName={row.original.name}
          />
        </div>
      ),
    },
  ]

  return (
    <div className="876-card overflow-hidden">
      <DataTable
        emptyState={emptyState}
        columns={columns}
        data={products}
        onRowClick={(product) => router.push(`/products/${product.id}`)}
      />
    </div>
  )
}
