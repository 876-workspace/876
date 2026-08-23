'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { formatMoney } from '@/lib/money'
import { MoreHorizontalIcon, Trash } from '@876/ui/icons'
import { buttonVariants } from '@876/ui/button'
import { Badge } from '@876/ui/badge'
import { DataTable } from '@876/ui/data-table'
import { DataTableColumnHeader } from '@876/ui/data-table-column-header'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@876/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@876/ui/alert-dialog'
import { cn } from '@876/core/utils'
import type { LegacyColumnDef as ColumnDef } from '@tanstack/react-table/legacy'
import { statusBadgeClass } from '@/lib/format'
import { client } from '@/lib/client'

export type PriceItem = {
  id: string
  name: string | null
  nickname: string | null
  unit_amount: number | null
  currency: string
  billing_interval: string | null
  interval_count: number | null
  billing_scheme: string
  tiers_mode: string | null
  trial_period_days: number | null
  tax_behavior: string | null
  status: string
}
export type PricingSetup = {
  productId: string
  prices: PriceItem[]
  newHref: string
  /** Base path for this product's prices; edit hrefs are derived from it. */
  basePath: string
}

function billingLabel(price: PriceItem): string {
  if (!price.billing_interval) return 'One-time'

  const count = price.interval_count ?? 1
  const unit = `${price.billing_interval}${count === 1 ? '' : 's'}`
  return `Every ${count} ${unit}`
}

function modelLabel(price: PriceItem): string {
  if (price.billing_scheme !== 'tiered') return 'Flat'
  return price.tiers_mode === 'volume'
    ? 'Tiered · Volume'
    : 'Tiered · Graduated'
}

export function PlanPricingTable({ setup }: { setup: PricingSetup }) {
  const router = useRouter()
  const [archiving, setArchiving] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const archive = () => {
    if (!archiving) return
    startTransition(async () => {
      const { error } = await client.products.archivePrice(
        setup.productId,
        archiving
      )
      if (!error) {
        setArchiving(null)
        router.refresh()
      }
    })
  }

  const columns: ColumnDef<PriceItem>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => (
        <div className="min-w-0">
          <Link
            className="hover:text-foreground font-medium transition-colors"
            href={`${setup.basePath}/${row.original.id}/edit`}
          >
            {row.original.name || row.original.nickname || '—'}
          </Link>
          <div className="text-muted-foreground font-mono text-xs">
            {row.original.id}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'unit_amount',
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Amount"
          className="justify-end"
        />
      ),
      cell: ({ row }) => (
        <span className="block text-right font-mono tabular-nums">
          {formatMoney(row.original.unit_amount, row.original.currency)}
        </span>
      ),
    },
    {
      id: 'model',
      enableSorting: false,
      header: 'Model',
      cell: ({ row }) => modelLabel(row.original),
    },
    {
      accessorKey: 'billing_interval',
      enableSorting: false,
      header: 'Billing',
      cell: ({ row }) => billingLabel(row.original),
    },
    {
      id: 'flags',
      enableSorting: false,
      header: 'Flags',
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.trial_period_days ? (
            <Badge variant="info">
              Trial {row.original.trial_period_days}d
            </Badge>
          ) : null}
          {row.original.tax_behavior &&
          row.original.tax_behavior !== 'unspecified' ? (
            <Badge variant="outline">Tax {row.original.tax_behavior}</Badge>
          ) : null}
          {!row.original.trial_period_days &&
            (!row.original.tax_behavior ||
              row.original.tax_behavior === 'unspecified') && (
              <span className="text-muted-foreground">—</span>
            )}
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
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
      id: 'actions',
      enableSorting: false,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'icon-sm' })
            )}
            aria-label={`Actions for price ${row.original.id}`}
          >
            <MoreHorizontalIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() =>
                router.push(`${setup.basePath}/${row.original.id}/edit`)
              }
            >
              Edit
            </DropdownMenuItem>
            {row.original.status === 'active' ? (
              <DropdownMenuItem
                className="text-red-500 focus:text-red-500"
                onClick={() => setArchiving(row.original.id)}
              >
                <Trash /> Archive
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <>
      <DataTable
        key={`pricing-table:${setup.basePath}`}
        columns={columns}
        data={setup.prices}
        emptyState={
          <div className="text-muted-foreground py-6 text-sm">
            No prices yet. Add one to start selling this plan.
          </div>
        }
      />
      <AlertDialog
        open={archiving !== null}
        onOpenChange={(open) => !open && setArchiving(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive price</AlertDialogTitle>
            <AlertDialogDescription>
              Existing subscribers keep their current price.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={archive} disabled={pending}>
              {pending ? 'Archiving…' : 'Archive'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
