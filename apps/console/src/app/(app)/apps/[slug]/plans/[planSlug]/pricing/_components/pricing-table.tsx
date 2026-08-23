'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { formatMoney } from '@/lib/money'
import { MoreHorizontalIcon, Plus, Trash } from '@876/ui/icons'
import { Button, buttonVariants } from '@876/ui/button'
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
  editHref: (id: string) => string
}

export function PricingTable({ setup }: { setup: PricingSetup }) {
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
        <div>
          <Link className="font-medium" href={setup.editHref(row.original.id)}>
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
        <DataTableColumnHeader column={column} title="Amount" />
      ),
      cell: ({ row }) => (
        <span className="font-mono tabular-nums">
          {formatMoney(row.original.unit_amount, row.original.currency)}
        </span>
      ),
    },
    {
      id: 'model',
      header: 'Model',
      cell: ({ row }) =>
        row.original.billing_scheme === 'tiered'
          ? `Tiered · ${row.original.tiers_mode === 'volume' ? 'Volume' : 'Graduated'}`
          : 'Flat',
    },
    {
      accessorKey: 'billing_interval',
      header: 'Billing',
      cell: ({ row }) => {
        const p = row.original
        return p.billing_interval
          ? `Every ${p.interval_count ?? 1} ${p.billing_interval}${(p.interval_count ?? 1) === 1 ? '' : 's'}`
          : 'One-time'
      },
    },
    {
      id: 'flags',
      header: 'Flags',
      cell: ({ row }) => (
        <div className="flex gap-1">
          {row.original.trial_period_days ? (
            <Badge variant="secondary">
              Trial {row.original.trial_period_days} days
            </Badge>
          ) : null}
          {row.original.tax_behavior ? (
            <Badge variant="secondary">Tax {row.original.tax_behavior}</Badge>
          ) : (
            <span>—</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge
          variant={row.original.status === 'active' ? 'default' : 'secondary'}
        >
          {row.original.status === 'active' ? 'Active' : 'Archived'}
        </Badge>
      ),
    },
    {
      id: 'actions',
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
              onClick={() => router.push(setup.editHref(row.original.id))}
            >
              Edit
            </DropdownMenuItem>
            {row.original.status === 'active' ? (
              <DropdownMenuItem
                className="text-red-500"
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
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          variant="info"
          size="sm"
          onClick={() => router.push(setup.newHref)}
        >
          <Plus /> Add price
        </Button>
      </div>
      <div className="876-card">
        <DataTable columns={columns} data={setup.prices} />
      </div>
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
    </div>
  )
}
