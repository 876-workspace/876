'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ColumnDef } from '@tanstack/react-table'
import type { AdminProduct } from '@876/admin'
import { cn } from '@876/core/utils'
import { DataTable } from '@876/ui/data-table'
import { buttonVariants } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { CreditCard, Plus, SearchIcon } from '@876/ui/icons'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'

import { formatDate, statusBadgeClass } from '@/lib/format'

type Props = { data: AdminProduct[]; appId: string; appSlug: string }

function formatPrice(product: AdminProduct): string {
  const price = product.prices[0]
  if (!price || price.unit_amount === 0) return 'Free'
  const amount = (price.unit_amount / 100).toFixed(2)
  const interval = price.billing_interval ? `/${price.billing_interval}` : ''
  return `$${amount} ${price.currency.toUpperCase()}${interval}`
}

function buildColumns(): ColumnDef<AdminProduct, unknown>[] {
  return [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.name}</p>
          <p className="text-muted-foreground font-mono text-xs">
            {row.original.slug}
          </p>
        </div>
      ),
    },
    {
      id: 'price',
      header: 'Price',
      cell: ({ row }) => (
        <span className="text-sm">{formatPrice(row.original)}</span>
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
      accessorKey: 'updated_at',
      header: 'Updated',
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {formatDate(row.original.updated_at)}
        </span>
      ),
    },
  ]
}

export function PlansTable({ data, appSlug }: Props) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const columns = useMemo(() => buildColumns(), [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return data
    return data.filter(
      (product) =>
        product.name.toLowerCase().includes(q) ||
        product.slug.toLowerCase().includes(q)
    )
  }, [data, query])

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-80 lg:w-96">
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search plans by name or slug…"
            className="pl-9"
            aria-label="Search plans"
          />
        </div>

        <Link
          href={`/apps/${appSlug}/plans/new`}
          className={buttonVariants({ variant: 'info', size: 'sm' })}
        >
          <Plus className="size-4" strokeWidth={2.25} />
          Add plan
        </Link>
      </div>

      <div className="876-card overflow-hidden">
        <DataTable
          columns={columns}
          data={filtered}
          emptyState={
            <Empty className="border-border/60 bg-muted/5 border-dashed py-8">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CreditCard className="text-violet-600 dark:text-violet-400" />
                </EmptyMedia>
                <EmptyTitle className="text-foreground text-base font-semibold">
                  {query.trim() ? 'No matching plans' : 'No plans'}
                </EmptyTitle>
                <EmptyDescription className="text-muted-foreground/90 max-w-[360px] text-sm leading-relaxed">
                  {query.trim()
                    ? 'No plans match the current search.'
                    : 'Plans for this application will appear here once created.'}
                </EmptyDescription>
              </EmptyHeader>
              {!query.trim() && (
                <EmptyContent>
                  <Link
                    href={`/apps/${appSlug}/plans/new`}
                    className={cn(
                      buttonVariants({ variant: 'outline', size: 'sm' }),
                      'h-8 text-xs'
                    )}
                  >
                    Add plan
                  </Link>
                </EmptyContent>
              )}
            </Empty>
          }
          onRowClick={(product) =>
            router.push(`/apps/${appSlug}/plans/${product.slug}`)
          }
        />
      </div>
    </div>
  )
}
