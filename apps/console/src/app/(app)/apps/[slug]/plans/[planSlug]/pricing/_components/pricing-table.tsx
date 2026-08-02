'use client'

import { useState, useTransition, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Pencil,
  MoreHorizontalIcon,
  CreditCard,
  Plus,
  Trash,
} from '@876/ui/icons'
import type { ColumnDef } from '@tanstack/react-table'

import { cn } from '@876/core/utils'
import { Button, buttonVariants } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'
import { Badge } from '@876/ui/badge'
import { DataTable } from '@876/ui/data-table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@876/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@876/ui/dropdown-menu'
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
} from '@876/ui/empty'
import { toast } from 'sonner'

import { client } from '@/lib/client'

type PriceItem = {
  id: string
  name: string | null
  nickname: string | null
  unit_amount: number
  currency: string
  billing_interval: string | null
  status: string
}

const formatMoney = (amount: number, currency: string = 'usd') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100)
}

function CopyChip({ value, className }: { value: string; className?: string }) {
  return (
    <code
      className={cn(
        'bg-secondary/40 text-muted-foreground/90 rounded px-1.5 py-0.5 font-mono text-[10px] select-all',
        className
      )}
    >
      {value}
    </code>
  )
}

type Props = { prices: PriceItem[]; productId: string }

export function PricingTable({ prices, productId }: Props) {
  const router = useRouter()

  // Add price state
  const [showAdd, setShowAdd] = useState(false)
  const [newPriceName, setNewPriceName] = useState('')
  const [newPriceDollars, setNewPriceDollars] = useState('0')
  const [newPriceInterval, setNewPriceInterval] = useState<
    'none' | 'month' | 'year'
  >('none')
  const [addError, setAddError] = useState<string | null>(null)
  const [isAddPending, startAddTransition] = useTransition()

  // Edit price name state
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null)
  const [editPriceName, setEditPriceName] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [isEditPending, startEditTransition] = useTransition()

  // Archive confirm state
  const [archivingPriceId, setArchivingPriceId] = useState<string | null>(null)
  const [archiveError, setArchiveError] = useState<string | null>(null)
  const [isArchivePending, startArchiveTransition] = useTransition()

  const handleAddPrice = useCallback(() => {
    setAddError(null)
    const unitAmount = Math.round(Number(newPriceDollars || '0') * 100)
    startAddTransition(async () => {
      const { error } = await client.products.createPrice(productId, {
        unit_amount: Number.isFinite(unitAmount) ? unitAmount : 0,
        currency: 'jmd',
        billing_interval: newPriceInterval === 'none' ? null : newPriceInterval,
        name: newPriceName.trim() || undefined,
      })
      if (error) {
        setAddError(error.message)
        return
      }
      setShowAdd(false)
      setNewPriceName('')
      setNewPriceDollars('0')
      setNewPriceInterval('none')
      router.refresh()
    })
  }, [productId, newPriceName, newPriceDollars, newPriceInterval, router])

  const handleStartEdit = useCallback((price: PriceItem) => {
    setEditingPriceId(price.id)
    setEditPriceName(price.name ?? price.nickname ?? '')
    setEditError(null)
  }, [])

  const handleSaveName = useCallback(() => {
    if (!editingPriceId) return
    setEditError(null)
    startEditTransition(async () => {
      const { error } = await client.products.updatePrice(
        productId,
        editingPriceId,
        {
          name: editPriceName.trim() || undefined,
        }
      )
      if (error) {
        setEditError(error.message)
        return
      }
      setEditingPriceId(null)
      router.refresh()
    })
  }, [editingPriceId, editPriceName, productId, router])

  const handleArchive = useCallback((priceId: string) => {
    setArchiveError(null)
    setArchivingPriceId(priceId)
  }, [])

  const handleConfirmArchive = useCallback(() => {
    if (!archivingPriceId) return
    setArchiveError(null)
    startArchiveTransition(async () => {
      const { error } = await client.products.archivePrice(
        productId,
        archivingPriceId
      )
      if (error) {
        setArchiveError(error.message)
        return
      }
      toast.success('Price archived.')
      setArchivingPriceId(null)
      router.refresh()
    })
  }, [archivingPriceId, productId, router])

  const columns = useMemo(
    (): ColumnDef<PriceItem>[] => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => {
          const price = row.original
          if (editingPriceId === price.id) {
            return (
              <div className="flex flex-col gap-1.5">
                <Input
                  value={editPriceName}
                  onChange={(e) => setEditPriceName(e.target.value)}
                  className="h-7 text-xs"
                  autoFocus
                />
                {editError && (
                  <p className="text-destructive text-[11px]">{editError}</p>
                )}
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    className="h-6 px-2 text-[11px]"
                    onClick={handleSaveName}
                    disabled={isEditPending}
                  >
                    {isEditPending ? 'Saving…' : 'Save'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-[11px]"
                    onClick={() => setEditingPriceId(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )
          }
          return (
            <div className="flex flex-col gap-1">
              <span className="text-foreground flex items-center gap-1.5 text-sm font-medium">
                {price.name || price.nickname || (
                  <span className="text-muted-foreground">—</span>
                )}
              </span>
              <CopyChip value={price.id} className="w-fit" />
            </div>
          )
        },
      },
      {
        accessorKey: 'unit_amount',
        header: 'Amount',
        cell: ({ row }) => {
          const price = row.original
          return (
            <span className="text-foreground font-mono text-sm tabular-nums">
              {formatMoney(price.unit_amount, price.currency)}
            </span>
          )
        },
      },
      {
        accessorKey: 'billing_interval',
        header: 'Billing',
        cell: ({ row }) => {
          const price = row.original
          return (
            <span className="text-foreground text-sm capitalize">
              {price.billing_interval || 'One-time'}
            </span>
          )
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const price = row.original
          return price.status === 'active' ? (
            <Badge className="border-0 bg-emerald-500/10 px-2 py-0.5 font-medium text-emerald-500 hover:bg-emerald-500/10">
              Active
            </Badge>
          ) : (
            <Badge variant="secondary" className="border-0 px-2 py-0.5">
              Archived
            </Badge>
          )
        },
      },
      {
        id: 'actions',
        cell: ({ row }) => {
          const price = row.original
          return (
            <div className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger
                  className={cn(
                    buttonVariants({ variant: 'ghost', size: 'icon-sm' })
                  )}
                  aria-label={`Actions for price ${price.id}`}
                >
                  <MoreHorizontalIcon className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-auto min-w-44">
                  <DropdownMenuItem onClick={() => handleStartEdit(price)}>
                    <Pencil className="size-4" /> Edit name
                  </DropdownMenuItem>
                  {price.status === 'active' && (
                    <DropdownMenuItem
                      className="text-red-500 focus:text-red-500"
                      onClick={() => handleArchive(price.id)}
                    >
                      <Trash className="size-4" /> Archive
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
      },
    ],
    [
      editingPriceId,
      editPriceName,
      editError,
      isEditPending,
      handleSaveName,
      handleStartEdit,
      handleArchive,
    ]
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button
          variant="info"
          size="sm"
          className="h-8 gap-1.5 px-2.5 text-xs"
          onClick={() => setShowAdd(true)}
        >
          <Plus className="size-4" strokeWidth={2.25} />
          Add price
        </Button>
      </div>
      <div className="876-card">
        <DataTable
          columns={columns}
          data={prices}
          emptyState={
            <div className="p-6">
              <Empty className="border-border/60 bg-muted/5 border-dashed py-8">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <CreditCard className="text-violet-600 dark:text-violet-400" />
                  </EmptyMedia>
                  <EmptyTitle className="text-foreground text-base font-semibold">
                    No prices configured
                  </EmptyTitle>
                  <EmptyDescription className="text-muted-foreground/90 max-w-[360px] text-sm leading-relaxed">
                    Configure prices in Stripe or add one here to get started.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setShowAdd(true)}
                  >
                    Add price
                  </Button>
                </EmptyContent>
              </Empty>
            </div>
          }
        />
      </div>

      {/* Add Price Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add price</DialogTitle>
            <DialogDescription>
              Add a new price point to this plan.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pricing-price-name">
                Name{' '}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Input
                id="pricing-price-name"
                placeholder="e.g. Monthly Standard"
                value={newPriceName}
                onChange={(e) => setNewPriceName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pricing-price-amount">Price (JMD)</Label>
              <Input
                id="pricing-price-amount"
                type="number"
                min="0"
                step="0.01"
                value={newPriceDollars}
                onChange={(e) => setNewPriceDollars(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pricing-price-interval">Interval</Label>
              <NativeSelect
                id="pricing-price-interval"
                value={newPriceInterval}
                onChange={(e) =>
                  setNewPriceInterval(e.target.value as typeof newPriceInterval)
                }
              >
                <NativeSelectOption value="none">
                  No recurring charge
                </NativeSelectOption>
                <NativeSelectOption value="month">Monthly</NativeSelectOption>
                <NativeSelectOption value="year">Yearly</NativeSelectOption>
              </NativeSelect>
            </div>
            {addError && <p className="text-destructive text-sm">{addError}</p>}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAdd(false)}
              disabled={isAddPending}
            >
              Cancel
            </Button>
            <Button onClick={handleAddPrice} disabled={isAddPending}>
              {isAddPending ? 'Adding…' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive Confirm Dialog */}
      <Dialog
        open={!!archivingPriceId}
        onOpenChange={() => {
          if (!isArchivePending) setArchivingPriceId(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive price</DialogTitle>
            <DialogDescription>
              Are you sure you want to archive this price? Existing subscribers
              will keep their current price.
            </DialogDescription>
          </DialogHeader>
          {archiveError && (
            <p className="text-destructive text-sm">{archiveError}</p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setArchivingPriceId(null)}
              disabled={isArchivePending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmArchive}
              disabled={isArchivePending}
            >
              {isArchivePending ? 'Archiving…' : 'Archive'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
